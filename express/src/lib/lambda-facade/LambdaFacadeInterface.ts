import {AxiosResponse} from "axios";
import {OnboardingTableItem} from "../../../@types/OnboardingTableItem";
import {Service} from "../../../@types/Service";
import {User} from "../../../@types/user";
import {AuthenticationResultType} from "@aws-sdk/client-cognito-identity-provider";

export default interface LambdaFacadeInterface {
    putUser(user: OnboardingTableItem, accessToken: string): Promise<AxiosResponse>;

    updateUser(selfServiceUserId: string, cognitoUserId: string, updates: object, accessToken: string): Promise<AxiosResponse>;

    getUserByCognitoId(cognitoId: string, accessToken: string): Promise<AxiosResponse>;

    newService(service: Service, user: User, accessToken: string): Promise<AxiosResponse>;

    generateClient(service: Service, authenticationResult: AuthenticationResultType): Promise<AxiosResponse>;

    listServices(userId: string, accessToken: string): Promise<AxiosResponse>;

    listClients(serviceId: string, accessToken: string): Promise<AxiosResponse>;

    updateClient(
        serviceId: string,
        selfServiceClientId: string,
        clientId: string,
        updates: object,
        accessToken: string
    ): Promise<AxiosResponse>;

    privateBetaRequest(
        name: string,
        department: string,
        serviceName: string,
        emailAddress: string,
        accessToken: string
    ): Promise<AxiosResponse>;
}
