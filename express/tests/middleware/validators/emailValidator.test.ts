import {AuthenticationResultType} from "@aws-sdk/client-cognito-identity-provider";
import {NextFunction, Request, Response} from "express";
import {Session, SessionData} from "express-session";
import {emailValidator} from "../../../src/middleware/validators/emailValidator";
import {MfaResponse} from "../../../src/services/self-service-services-service";

declare module "express-session" {
    interface SessionData {
        emailAddress: string;
        mobileNumber: string;
        enteredMobileNumber: string;
        cognitoSession: string;
        authenticationResult: AuthenticationResultType;
        mfaResponse: MfaResponse;
        updatedField: string;
        isSignedIn: boolean;
    }
}

describe("It checks whether an email is valid and behaves accordingly", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let mockSession: Partial<Session & Partial<SessionData>>;

    beforeEach(() => {
        mockSession = {};
        mockRequest = {
            body: jest.fn(),
            session: mockSession as Session
        };

        nextFunction = jest.fn();
        mockResponse = {render: jest.fn()};
    });

    it("calls the NextFunction if the security code is valid", async () => {
        mockRequest.body.emailAddress = "valid@test.gov.uk";
        await emailValidator("sign-in.njk")(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });

    it("renders the correct page if the email address is not valid", async () => {
        mockRequest.body.emailAddress = "nope@test.yahoo.uk";
        mockResponse = {
            render: jest.fn()
        };

        await emailValidator("sign-in.njk")(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.render).toHaveBeenCalledWith("sign-in.njk", {
            values: {
                emailAddress: mockRequest.body.emailAddress
            },
            errorMessages: {
                emailAddress: "Enter a government email address"
            }
        });
    });
});
