import {AuthenticationResultType, NotAuthorizedException, UserNotFoundException} from "@aws-sdk/client-cognito-identity-provider";
import {Request, Response} from "express";
import "express-async-errors";
import SelfServiceServicesService from "../services/self-service-services-service";
import {SelfServiceErrors} from "../lib/errors";

export const showSignInFormEmail = async function (req: Request, res: Response) {
    res.render("sign-in.njk");
};

export const showLoginOtpMobile = async function (req: Request, res: Response) {
    if (!req.session.emailAddress || !req.session.mfaResponse) {
        res.redirect("/sign-in");
        return;
    }

    res.render("check-mobile.njk", {
        mobileNumber: req.session.mfaResponse.codeSentTo,
        formActionUrl: "/sign-in-otp-mobile",
        active: "sign-in",
        textMessageNotReceivedUrl: "/resend-text-code"
    });
};

export const finishSignIn = async function (req: Request, res: Response) {
    const s4: SelfServiceServicesService = req.app.get("backing-service");
    req.session.selfServiceUser = await s4.getSelfServiceUser(req.session.authenticationResult as AuthenticationResultType);

    if (req.session.selfServiceUser) {
        req.session.isSignedIn = true;
        res.redirect("/account/list-services");
        return;
    } else {
        res.redirect("/sign-in-otp-mobile");
    }
};

export const processEmailAddress = async function (req: Request, res: Response) {
    res.redirect("/sign-in-password");
};

export const showSignInFormPassword = async function (req: Request, res: Response) {
    res.render("sign-in-enter-password.njk");
};

export const processSignInForm = async function (req: Request, res: Response) {
    const email = req.session.emailAddress as string;
    const password = req.body.password;
    const s4: SelfServiceServicesService = req.app.get("backing-service");

    try {
        req.session.mfaResponse = await s4.login(email, password);
    } catch (error) {
        if (error instanceof NotAuthorizedException) {
            throw SelfServiceErrors.Render("sign-in-enter-password.njk", "", {
                values: {password: password},
                errorMessages: {password: "Password is wrong"}
            });
        }

        if (error instanceof UserNotFoundException) {
            req.session.emailAddress = email;
            res.redirect("/create/get-email");
            return;
        }

        console.error(error);
        res.render("there-is-a-problem.njk");
        return;
    }

    res.redirect("/sign-in-otp-mobile");
    return;
};

export const signOut = async function (req: Request, res: Response) {
    req.session.destroy(() => res.redirect("/"));
};

export const showResendPhoneCodeForm = async function (req: Request, res: Response) {
    const accessToken: string | undefined = req.session.authenticationResult?.AccessToken;
    if (accessToken === undefined) {
        // user must login before we can process their mobile number
        res.redirect("/sign-in");
        return;
    }
    res.render("resend-phone-code-sign-in.njk");
};

export const resendMobileVerificationCode = async function (req: Request, res: Response) {
    req.body.mobileNumber = req.session.mobileNumber;
    await processEnterMobileForm(req, res);
};

export const processEnterMobileForm = async function (req: Request, res: Response) {
    // The user needs to be logged in for this
    const accessToken: string | undefined = req.session.authenticationResult?.AccessToken;
    if (accessToken === undefined) {
        // user must login before we can process their mobile number
        res.redirect("/sign-in");
        return;
    }

    const mobileNumber: string | undefined = req.session.mobileNumber;
    const s4: SelfServiceServicesService = await req.app.get("backing-service");
    // Not sure that we need this here ....
    if (mobileNumber === undefined) {
        res.render("there-is-a-problem.njk");
    }

    // @ts-ignore
    const response = await s4.setPhoneNumber(req.session.emailAddress, mobileNumber);

    // presumably that was fine so let's try to veerify the number

    const codeSent = await s4.sendMobileNumberVerificationCode(accessToken);
    console.debug("VERIFICATION CODE RESPONSE");
    console.debug(codeSent);
    req.session.mobileNumber = mobileNumber;

    const mobileNumberRaw = req.body.mobileNumber;
    const mobileNumberLast4Digits = mobileNumberRaw.slice(-4);
    const mobileNumberFormatted = "*******" + mobileNumberLast4Digits;

    res.render("check-mobile.njk", {
        mobileNumber: mobileNumberFormatted,
        formActionUrl: "/sign-in-otp-mobile",
        textMessageNotReceivedUrl: "/resend-text-code",
        active: "sign-in"
    });
};
