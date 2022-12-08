import {When} from "@cucumber/cucumber";
import {clickSubmitButton, enterTextIntoTextInput} from "./shared-functions";

When("the user submits the SMS OTP {string}", async function (smsOtp: string) {
    await enterTextIntoTextInput(this.page, smsOtp, "sms-otp");
    await clickSubmitButton(this.page);
});

When("the user submits the service name {string}", async function (serviceName: string) {
    await enterTextIntoTextInput(this.page, serviceName, "serviceName");
    await clickSubmitButton(this.page);
});

When("the user submits a valid password", async function () {
    await enterTextIntoTextInput(this.page, "this-is-not-a-common-password", "password");
    await clickSubmitButton(this.page);
});

When("the user submits a correct email OTP", async function () {
    await enterTextIntoTextInput(this.page, "123123", "create-email-otp");
    await clickSubmitButton(this.page);
});

When("the user submits a valid mobile phone number", async function () {
    await enterTextIntoTextInput(this.page, "07700 900123", "mobileNumber");
    await clickSubmitButton(this.page);
});

When("the user submits a correct SMS OTP", async function () {
    await enterTextIntoTextInput(this.page, "123123", "sms-otp");
    await clickSubmitButton(this.page);
});

When("the user submits a correct service name", async function () {
    await enterTextIntoTextInput(this.page, "Test Service", "serviceName");
    await clickSubmitButton(this.page);
});
