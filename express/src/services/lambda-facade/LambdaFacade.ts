import axios, {Axios, AxiosResponse} from "axios";
import {Service} from "../../../@types/Service";
import LambdaFacadeInterface from "./LambdaFacadeInterface";
import {AuthenticationResultType} from "@aws-sdk/client-cognito-identity-provider";
import AuthenticationResultParser from "../../lib/AuthenticationResultParser";
import {OnboardingTableItem} from "../../../@types/OnboardingTableItem";

class LambdaFacade implements LambdaFacadeInterface {
    private instance: Axios;

    constructor(baseURL: string) {
        this.instance = axios.create({
            baseURL: baseURL,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    async putUser(user: OnboardingTableItem, accessToken: string): Promise<AxiosResponse> {
        return await (
            await this.instance
        ).post("/Prod/put-user", user, {
            headers: {
                "authorised-by": accessToken
            }
        });
    }

    async getUserByCognitoId(cognitoId: string, accessToken: string): Promise<AxiosResponse> {
        return await (
            await this.instance
        ).post("/Prod/get-user", `user#${cognitoId}`, {
            headers: {
                "authorised-by": accessToken
            }
        });
    }

    async newService(service: Service, userId: string, email: string, accessToken: string): Promise<AxiosResponse> {
        const body = {
            service: service,
            userDynamoId: userId,
            userEmail: email
        };
        return await (
            await this.instance
        ).post("/Prod/new-service", JSON.stringify(body), {
            headers: {
                "authorised-by": accessToken
            }
        });
    }

    async generateClient(service: Service, authenticationResult: AuthenticationResultType): Promise<AxiosResponse> {
        const body = {
            service: service,
            contactEmail: AuthenticationResultParser.getEmail(authenticationResult)
        };
        return await (
            await this.instance
        ).post("/Prod/new-client", JSON.stringify(body), {
            headers: {
                "authorised-by": authenticationResult.AccessToken as string
            }
        });
    }

    async updateClient(
        serviceId: string,
        selfServiceClientId: string,
        clientId: string,
        updates: object,
        accessToken: string
    ): Promise<AxiosResponse> {
        // constrain type later
        const body = {
            serviceId: serviceId,
            selfServiceClientId: selfServiceClientId,
            clientId: clientId,
            updates: updates
        };
        return await (
            await this.instance
        ).post(`/Prod/do-update-client`, JSON.stringify(body), {
            headers: {
                "authorised-by": accessToken
            }
        });
    }

    async listServices(userId: string, accessToken: string): Promise<AxiosResponse> {
        return await (await this.instance).get(`/Prod/get-services/${userId}`);
    }

    async listClients(serviceId: string, accessToken: string): Promise<AxiosResponse> {
        const bareServiceId = serviceId.startsWith("service#") ? serviceId.substring(8) : serviceId;
        return await (await this.instance).get(`/Prod/get-service-clients/${bareServiceId}`);
    }

    async updateUser(selfServiceUserId: string, updates: object, accessToken: string): Promise<AxiosResponse> {
        const body = {
            userId: selfServiceUserId,
            updates: updates
        };

        return await (
            await this.instance
        ).post("/Prod/update-user", JSON.stringify(body), {
            headers: {
                "authorised-by": accessToken
            }
        });
    }

    async privateBetaRequest(
        name: string,
        department: string,
        serviceName: string,
        emailAddress: string,
        accessToken: string
    ): Promise<AxiosResponse> {
        const body = {
            name: name,
            department: department,
            serviceName: serviceName,
            emailAddress: emailAddress
        };

        return await (await this.instance).post("/Prod/send-private-beta-request-notification", JSON.stringify(body));
    }
}

export const lambdaFacadeInstance = new LambdaFacade(process.env.API_BASE_URL as string);
