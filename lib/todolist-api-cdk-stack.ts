import {
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { TableEncryption } from "aws-cdk-lib/aws-dynamodb";

export class TodolistApiCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define stage at deploy time; e.g: cdk deploy STAGE=prod
    const STAGE = process.env.STAGE || "dev";

    //Dynamodb Table
    const todoTable = new dynamodb.Table(this, "TodoApiDDBTable", {
      tableName: "todo-items-ddb-table",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.DEFAULT,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
    });

    //Lambda Iam role and Policy to access Dynamodb Table
    const todoLambdaRole = new iam.Role(this, "TodoApiLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    todoLambdaRole.attachInlinePolicy(
      new iam.Policy(this, "TodoApiLambdaPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "dynamodb:GetItem",
              "dynamodb:Scan",
              "dynamodb:Query",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
            ],
            resources: [todoTable.tableArn],
          }),
        ],
      })
    );

    //Lambdas
    const getItemsFn = new lambda.Function(this, "TodoApiGetIemsLambda", {
      functionName: "todo-api-get-items-fn",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "get-items.main",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "/../resources/lambda/getItemsFn")
      ),
      role: todoLambdaRole,
      timeout: Duration.seconds(15),
      memorySize: 1024,
    });
    const getItemFn = new lambda.Function(this, "TodoApiGetIemLambda", {
      functionName: "todo-api-get-item-fn",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "get-item.main",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "/../resources/lambda/getItemFn")
      ),
      role: todoLambdaRole,
      timeout: Duration.seconds(15),
      memorySize: 1024,
    });
    const upsertItemFn = new lambda.Function(this, "TodoApiUpsertIemLambda", {
      functionName: "todo-api-upsert-item-fn",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "upsert-item.main",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "/../resources/lambda/upsertItemFn")
      ),
      role: todoLambdaRole,
      timeout: Duration.seconds(15),
      memorySize: 1024,
    });
    const deleteItemFn = new lambda.Function(this, "TodoApiDeleteIemLambda", {
      functionName: "todo-api-delete-item-fn",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "delete-item.main",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "/../resources/lambda/deleteItemFn")
      ),
      role: todoLambdaRole,
      timeout: Duration.seconds(15),
      memorySize: 1024,
    });

    //Versioning for lambda getItemFn
    const getItemFnV1 = new lambda.Version(this, "TodoApiGetItemV1", {
      lambda: getItemFn,
    });

    const getItemFnV1Alias = new lambda.Alias(this, "TodoApiGetItemV1Alias", {
      aliasName: "get-item-v1",
      version: getItemFnV1,
    });

    //RestApi config
    const todoApi = new apigateway.RestApi(this, "TodoRestApiConfig", {
      restApiName: "todo-rest-api",
      description: "TODO Rest API",
      deployOptions: {
        stageName: STAGE,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
        allowCredentials: true,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    });

    //RestApi Resources V1
    const apiV1 = todoApi.root.addResource("v1");
    const todosV1 = apiV1.addResource("todo");
    todosV1.addMethod("POST", new apigateway.LambdaIntegration(upsertItemFn));
    todosV1.addMethod("GET", new apigateway.LambdaIntegration(getItemsFn));
    const itemV1 = todosV1.addResource("{id}");
    itemV1.addMethod("GET", new apigateway.LambdaIntegration(getItemFnV1Alias));
    itemV1.addMethod("PUT", new apigateway.LambdaIntegration(upsertItemFn));
    itemV1.addMethod("DELETE", new apigateway.LambdaIntegration(deleteItemFn));

    //RestApi Resources V2
    const apiV2 = todoApi.root.addResource("v2");
    const todosV2 = apiV2.addResource("todo");
    const itemV2 = todosV2.addResource("{id}");
    itemV2.addMethod("GET", new apigateway.LambdaIntegration(getItemFn));

    new CfnOutput(this, "TodoApiUrl", {
      value: todoApi.url!,
    });
  }
}
