import validateMobileNumber from "../../src/middleware/mobileValidator";
import {Request, Response, NextFunction} from "express";
import {Session} from "express-session";

const INTERNATIONAL_PREFIX = "+44";
const UK_PREFIX = "0";
const NETWORK_CODE = "7700";
const FIRST_THREE_DIGITS = "900";
const LAST_THREE_DIGITS = "123";

const VALID_NUMBERS = [
    `${INTERNATIONAL_PREFIX}${NETWORK_CODE}${FIRST_THREE_DIGITS}${LAST_THREE_DIGITS}`,
    `${INTERNATIONAL_PREFIX}${NETWORK_CODE} ${FIRST_THREE_DIGITS} ${LAST_THREE_DIGITS}`,
    `${INTERNATIONAL_PREFIX}${NETWORK_CODE}-${FIRST_THREE_DIGITS}-${LAST_THREE_DIGITS}`,
    `${UK_PREFIX}${NETWORK_CODE}${FIRST_THREE_DIGITS}${LAST_THREE_DIGITS}`,
    `${UK_PREFIX}${NETWORK_CODE} ${FIRST_THREE_DIGITS} ${LAST_THREE_DIGITS}`,
    `${UK_PREFIX}${NETWORK_CODE}-${FIRST_THREE_DIGITS}-${LAST_THREE_DIGITS}`,
    `(${UK_PREFIX}${NETWORK_CODE})${FIRST_THREE_DIGITS}${LAST_THREE_DIGITS}`,
    `(${UK_PREFIX}${NETWORK_CODE}) ${FIRST_THREE_DIGITS} ${LAST_THREE_DIGITS}`,
    `(${UK_PREFIX}${NETWORK_CODE}) ${FIRST_THREE_DIGITS}-${LAST_THREE_DIGITS}`
];

const INVALID_NUMBERS = [
    "0115 496 0000",
    `${INTERNATIONAL_PREFIX}${NETWORK_CODE}${FIRST_THREE_DIGITS}`,
    `${INTERNATIONAL_PREFIX}${NETWORK_CODE}${FIRST_THREE_DIGITS}${FIRST_THREE_DIGITS}${FIRST_THREE_DIGITS}`
];

describe("Validating numbers works as expected", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    it("accepts valid numbers", async function () {
        for (const validNumber of VALID_NUMBERS) {
            const session: Session = {
                id: "",
                cookie: {originalMaxAge: 0},
                regenerate(callback: (err: any) => void): Session {
                    return this;
                },
                destroy(callback: (err: any) => void): Session {
                    return this;
                },
                reload(callback: (err: any) => void): Session {
                    return this;
                },
                resetMaxAge(): Session {
                    return this;
                },
                save(callback?: (err: any) => void): Session {
                    return this;
                },
                touch(): Session {
                    return this;
                }
            };
            mockRequest = {
                body: jest.fn(),
                session: session
            };
            mockResponse = {};
            nextFunction = await jest.fn();

            mockRequest.body.mobileNumber = validNumber;
            validateMobileNumber("./any-template.njk")(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        }
    });

    it("rejects invalid numbers", async function () {
        for (const validNumber of INVALID_NUMBERS) {
            mockRequest = {
                body: jest.fn()
            };
            mockResponse = {};
            nextFunction = await jest.fn();

            mockRequest.body.mobileNumber = validNumber;
            await expect(
                validateMobileNumber("./any-template.njk")(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction)
            ).rejects.toThrow(Error);
        }
    });
});
