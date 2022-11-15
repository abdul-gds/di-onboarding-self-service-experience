import {
    AdminCreateUserCommandOutput,
    AdminInitiateAuthCommandOutput,
    AdminSetUserMFAPreferenceCommandOutput,
    AuthenticationResultType,
    GetUserAttributeVerificationCodeCommandOutput
} from "@aws-sdk/client-cognito-identity-provider";
import {User, DynamoUser} from "../../@types/user";
import CognitoInterface from "./cognito/CognitoInterface";
import LambdaFacadeInterface from "./lambda-facade/LambdaFacadeInterface";
import {SelfServiceError} from "../lib/SelfServiceError";
import AuthenticationResultParser from "../lib/AuthenticationResultParser";
import {Service} from "../../@types/Service";
import {Client, ClientFromDynamo} from "../../@types/client";
import {userToDomainUser} from "../lib/userUtils";
import {dynamoServicesToDomainServices} from "../lib/serviceUtils";
import {dynamoClientToDomainClient} from "../lib/clientUtils";
import {unmarshall} from "@aws-sdk/util-dynamodb";
import {OnboardingTableItem} from "../../@types/OnboardingTableItem";

export default class SelfServiceServicesService {
    private cognito: CognitoInterface;
    private lambda: LambdaFacadeInterface;

    constructor(cognito: CognitoInterface, lambda: LambdaFacadeInterface) {
        this.cognito = cognito;
        this.lambda = lambda;
    }

    async changePassword(accessToken: string, previousPassword: string, proposedPassword: string) {
        await this.cognito.changePassword(accessToken, previousPassword, proposedPassword);
    }

    async forgotPassword(email: string) {
        await this.cognito.forgotPassword(email);
    }

    async respondToMfaChallenge(mfaResponsse: MfaResponse, mfaCode: string): Promise<AuthenticationResultType> {
        const response = await this.cognito.respondToMfaChallenge(mfaResponsse.cognitoId, mfaCode, mfaResponsse.cognitoSession);

        if (!response.AuthenticationResult) {
            throw new SelfServiceError("Did not get AuthenticationResult from Cognito");
        }

        return response.AuthenticationResult;
    }

    async getSelfServiceUser(authenticationResult: AuthenticationResultType): Promise<User> {
        if (!authenticationResult.IdToken) {
            throw new SelfServiceError("IdToken not present");
        }

        if (!authenticationResult.AccessToken) {
            throw new SelfServiceError("AccessToken not present");
        }

        const response = await this.lambda.getUserByCognitoId(
            AuthenticationResultParser.getCognitoId(authenticationResult),
            authenticationResult.AccessToken
        );
        return userToDomainUser(response.data.Item as DynamoUser);
    }

    async login(email: string, password: string): Promise<MfaResponse> {
        const response = await this.cognito.login(email, password);
        return {
            cognitoId: response.ChallengeParameters?.USER_ID_FOR_SRP as string,
            cognitoSession: response.Session as string,
            codeSentTo: response.ChallengeParameters?.CODE_DELIVERY_DESTINATION as string
        };
    }

    async putUser(user: OnboardingTableItem, accessToken: string) {
        // TODO this is somewhere we can simplify types.
        console.log(user);
        return await this.lambda.putUser(user, accessToken);
    }

    async setNewPassword(emailAddress: string, password: string, cognitoSession: string): Promise<AuthenticationResultType> {
        return (await this.cognito.setNewPassword(emailAddress, password, cognitoSession)).AuthenticationResult as AuthenticationResultType;
    }

    async setEmailAsVerified(emailAddress: string): Promise<void> {
        await this.cognito.setEmailAsVerified(emailAddress);
    }

    async createUser(emailAddress: string): Promise<AdminCreateUserCommandOutput> {
        return await this.cognito.createUser(emailAddress);
    }

    async resendEmailAuthCode(emailAddress: string) {
        return await this.cognito.resendEmailAuthCode(emailAddress);
    }

    async submitUsernamePassword(emailAddress: string, password: string) {
        return await this.cognito.login(emailAddress, password);
    }

    async setPhoneNumber(emailAddress: string, mobileNumber: string) {
        return await this.cognito.setPhoneNumber(emailAddress, mobileNumber);
    }

    async setMfaPreference(cognitoId: string): Promise<AdminSetUserMFAPreferenceCommandOutput> {
        return this.cognito.setMfaPreference(cognitoId);
    }

    async sendMobileNumberVerificationCode(accessToken: string): Promise<GetUserAttributeVerificationCodeCommandOutput> {
        return await this.cognito.sendMobileNumberVerificationCode(accessToken);
    }

    async useRefreshToken(refreshToken: string): Promise<AdminInitiateAuthCommandOutput> {
        return await this.cognito.useRefreshToken(refreshToken);
    }

    async verifyMobileUsingSmsCode(accessToken: string, code: string) {
        return this.cognito.verifyMobileUsingSmsCode(accessToken, code);
    }

    async setMobilePhoneAsVerified(emailAddress: string) {
        return await this.cognito.setMobilePhoneAsVerified(emailAddress);
    }

    async newService(service: Service, userId: string, authenticationResult: AuthenticationResultType) {
        const response = await this.lambda.newService(
            service,
            userId,
            AuthenticationResultParser.getEmail(authenticationResult),
            authenticationResult.AccessToken as string
        );
        return JSON.parse(response.data.output);
    }

    async generateClient(service: Service, authenticationResult: AuthenticationResultType) {
        return await this.lambda.generateClient(service, authenticationResult);
    }

    async updateClient(
        serviceId: string,
        selfServiceClientId: string,
        clientId: string,
        updates: {[key: string]: unknown},
        accessToken: string
    ): Promise<void> {
        await this.lambda.updateClient(serviceId, selfServiceClientId, clientId, updates, accessToken);
    }

    async privateBetaRequest(yourName: string, department: string, serviceName: string, emailAddress: string, accessToken: string) {
        await this.lambda.privateBetaRequest(yourName, department, serviceName, emailAddress, accessToken as string);
    }

    async listServices(userId: string, accessToken: string): Promise<Service[]> {
        return dynamoServicesToDomainServices((await this.lambda.listServices(userId, accessToken)).data.Items);
    }

    async updateUser(userId: string, updates: {[key: string]: unknown}, accessToken: string): Promise<void> {
        await this.lambda.updateUser(userId, updates, accessToken as string);
    }

    async listClients(serviceId: string, accessToken: string): Promise<Client[]> {
        return (await this.lambda.listClients(serviceId, accessToken)).data.Items.map((client: never) =>
            dynamoClientToDomainClient(unmarshall(client) as ClientFromDynamo)
        );
    }
}

export interface MfaResponse {
    cognitoSession: string;
    cognitoId: string;
    codeSentTo: string;
}
