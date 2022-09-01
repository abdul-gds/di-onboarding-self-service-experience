import {
    AttributeType,
    CodeMismatchException,
    NotAuthorizedException,
    UsernameExistsException
} from "@aws-sdk/client-cognito-identity-provider";
import {randomUUID} from "crypto";
import {NextFunction, Request, Response} from "express";
import CognitoInterface from "../lib/cognito/CognitoInterface";
import LambdaFacadeInterface from "../lib/lambda-facade/LambdaFacadeInterface";

export const showGetEmailForm = function (req: Request, res: Response) {
    res.render('create-account/get-email.njk', {values: {emailAddress: req.session.emailAddress}});
}

export const processGetEmailForm = async function (req: Request, res: Response) {
    const emailAddress: string = req.body.emailAddress;
    const cognitoClient: CognitoInterface = await req.app.get('cognitoClient');

    req.session.emailAddress = emailAddress;
    let result: any;
    try {
        result = await cognitoClient.createUser(emailAddress);
        console.debug(result);
    } catch (error) {
        if (error instanceof UsernameExistsException) {
            // Actually, we should check whether they've verified their email
            // If not, we should redirect them to the verify email page and tell them to check their email
            // That page should offer the chance to send a new code to their email address
            res.redirect('/sign-in');
            return;
        }
        console.error(error);
        res.redirect('/there-is-a-problem');
        return;
    }
    res.redirect('check-email'); // this is really a something went wrong moment and there must be other cases for us to try in particular - bad co
}

export const showCheckEmailForm = function (req: Request, res: Response) {
    if (!req.session.emailAddress) {
        console.error("No email address in session so we can't tell the user to check their email");
        res.redirect("/");
    } else {
        res.render('create-account/check-email.njk', {emailAddress: req.session.emailAddress});
    }
}

export const checkEmailOtp = async function (req: Request, res: Response) {
    const cognitoClient: CognitoInterface = await req.app.get('cognitoClient');

    if (!req.session.emailAddress) {
        res.redirect('get-email');
        return;
    }

    const sixDigitsPattern = /^[0-9]{6}$/;
    const otpToTest = req.body['create-email-otp'].trim();

    if (otpToTest === '') {
        const errorMessages = new Map<string, string>();
        errorMessages.set('create-email-otp', "Enter the security code");
        res.render('create-account/check-email.njk', {
            emailAddress: req.session.emailAddress,
            errorMessages: errorMessages
        });

        return;
    }

    if (!sixDigitsPattern.test(otpToTest)) {
        const errorMessages = new Map<string, string>();
        errorMessages.set('create-email-otp', "Enter the security code using only 6 digits");
        const value: object = {otp: otpToTest};
        res.render('create-account/check-email.njk', {
            emailAddress: req.session.emailAddress,
            errorMessages: errorMessages,
            value: value
        });

        return;
    }

    try {
        const response = await cognitoClient.login(req.session.emailAddress as string, req.body['create-email-otp']);
        req.session.session = response.Session;
        res.redirect('/create/update-password');
        return;
    } catch (error) {
        if (error instanceof NotAuthorizedException) {
            const errorMessages = new Map<string, string>();
            errorMessages.set('create-email-otp', "The code you entered is not correct or has expired - enter it again or request a new code");
            res.render('create-account/check-email.njk', {
                emailAddress: req.session.emailAddress,
                errorMessages: errorMessages,
            });
            return;
        }
    }
}

export const showNewPasswordForm = async function (req: Request, res: Response) {
    if (req.session.session !== undefined) {
        res.render('create-account/new-password.njk');
        return;
    } else {
        // TODO: This flow needs designing
        res.redirect('/sign-in');
    }
}

export const updatePassword = async function (req: Request, res: Response, next: NextFunction) {
    const cognitoClient: CognitoInterface = await req.app.get('cognitoClient');

    const response = await cognitoClient.setNewPassword(req.session.emailAddress as string, req.body['password'], req.session.session as string);
    req.session.session = response.Session;
    req.session.authenticationResult = response.AuthenticationResult;

    let user = await cognitoClient.getUser(req.session.emailAddress as string);
    // TODO: Do something better with this
    req.session.cognitoUser = user;
    let email: string | undefined;

    if (user.UserAttributes) {
        email = user.UserAttributes.filter((attribute: AttributeType) => attribute.Name === 'email')[0].Value;
    }

    if (email === undefined) {
        next(); // Who knows what could have gone wrong?
    } else {
        await cognitoClient.setEmailAsVerified(email);
    }

    res.redirect('/create/enter-mobile');
}

export const showEnterMobileForm = async function (req: Request, res: Response) {
    let accessToken: string | undefined = req.session.authenticationResult?.AccessToken;
    if (accessToken === undefined) {
        // user must log in before we can process their mobile number
        res.redirect('/sign-in')
        return;
    }
    if (req.session.mobileNumber === undefined) {
        res.render('create-account/enter-mobile.njk');
    } else {
        const value: object = {mobileNumber: req.session.mobileNumber};
        res.render('create-account/enter-mobile.njk', {
            value: value
        });
    }
}

export const processEnterMobileForm = async function (req: Request, res: Response) {
    // The user needs to be logged in for this
    let accessToken: string | undefined = req.session.authenticationResult?.AccessToken;
    if (accessToken === undefined) {
        // user must log in before we can process their mobile number
        res.redirect('/sign-in')
        return;
    }

    let mobileNumber: string | undefined = req.session.mobileNumber;
    const cognitoClient = await req.app.get('cognitoClient');
    if (mobileNumber === undefined) {
        res.render('create-account/enter-mobile.njk');
    }

    await cognitoClient.setPhoneNumber(req.session.emailAddress, mobileNumber);

    // presumably that was fine so let's try to verify the number
    const codeSent = await cognitoClient.sendMobileNumberVerificationCode(accessToken);
    console.debug("VERIFICATION CODE RESPONSE");
    console.debug(codeSent);
    req.session.mobileNumber = mobileNumber;
    res.render('common/check-mobile.njk', {
        values: {
            mobileNumber: req.body.mobileNumber,
            formActionUrl: '/create/verify-phone-code',
            textMessageNotReceivedUrl: "/create/resend-phone-code"
        }
    });
}

export const resendMobileVerificationCode = async function (req: Request, res: Response) {
    req.body.mobileNumber = req.session.mobileNumber;
    await processEnterMobileForm(req, res);
}

export const submitMobileVerificationCode = async function (req: Request, res: Response) {
    // need to check for access token in middleware
    if (req.session.authenticationResult?.AccessToken === undefined) {
        res.redirect('/sign-in');
        return;
    }

    const cognitoClient = await req.app.get('cognitoClient');
    let otp = req.body['sms-otp'];
    if (otp === undefined) {
        res.render('common/check-mobile.njk', {
            mobileNumber: req.session.mobileNumber,
            formActionUrl: '/create/verify-phone-code',
            textMessageNotReceivedUrl: '/create/resend-phone-code'
        });
        return;
    }

    try {
        await cognitoClient.verifySmsCode(req.session.authenticationResult?.AccessToken, otp);

        const uuid = randomUUID();
        const email = req.session.cognitoUser?.UserAttributes?.filter((attribute: AttributeType) => attribute.Name === 'email')[0].Value;
        const phone = req.session.enteredMobileNumber;

        await cognitoClient.setMfaPreference(req.session.cognitoUser?.Username as string);

        let user = {
            "pk": `user#${uuid}`,
            "sk": `cognito_username#${req.session.cognitoUser?.Username}`,
            "data": "we haven't collected this full name",
            first_name: "we haven't collected this first name",
            last_name: "we haven't collected this last name",
            email: email,
            phone: phone,
            password_last_updated: new Date()
        }

        const lambdaFacade: LambdaFacadeInterface = await req.app.get("lambdaFacade");
        await lambdaFacade.putUser(user, req.session.authenticationResult?.AccessToken);

        req.session.selfServiceUser = (await lambdaFacade.getUserByCognitoId(`cognito_username#${req.session.cognitoUser?.Username}`, req.session?.authenticationResult?.AccessToken as string)).data.Items[0]
        res.redirect('/add-service-name');
        return;

    } catch (error) {
        if (error instanceof CodeMismatchException) {
            const errorMessages = new Map<string, string>();
            errorMessages.set('smsOtp', 'The code you entered is not correct or has expired - enter it again or request a new code');
            res.render('common/check-mobile.njk', {
                mobileNumber: req.session.mobileNumber,
                errorMessages: errorMessages,
                formActionUrl: '/create/verify-phone-code',
                textMessageNotReceivedUrl: '/create/resend-phone-code'
            });
            return;
        }
        console.error(error);
        res.redirect('/there-is-a-problem');
        return;
    }
}

export const showResendPhoneCodeForm = async function (req: Request, res: Response) {
    let accessToken: string | undefined = req.session.authenticationResult?.AccessToken;
    if (accessToken === undefined) {
        // user must log in before we can process their mobile number
        res.redirect('/sign-in')
        return;
    }
    res.render('create-account/resend-phone-code.njk');
}

export const showResendEmailCodeForm = async function (req: Request, res: Response) {
    res.render('create-account/resend-email-code.njk');
}

export const resendEmailVerificationCode = async function (req: Request, res: Response) {
    req.body.emailAddress = req.session.emailAddress;
    const emailAddress: string = req.body.emailAddress;
    const cognitoClient: CognitoInterface = await req.app.get('cognitoClient');

    let result: any;
    try {
        result = await cognitoClient.resendEmailAuthCode(emailAddress);
        console.debug(result);
    } catch (error) {
        console.error(error);
        res.redirect('/there-is-a-problem');
        return;
    }
    res.redirect('check-email');
}
