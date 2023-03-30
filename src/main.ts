import { App, Stack, StackProps, RemovalPolicy, Expiration, Duration, CfnOutput } from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { TableClass } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export class MyStack extends Stack {
  private api!: appsync.GraphqlApi;
  private orderLambdaDatasource!: appsync.LambdaDataSource;
  private orderLambda!: lambda.Function;
  private customerTable!: dynamodb.Table;
  private productTable!: dynamodb.Table;
  private orderTable!: dynamodb.Table;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.createAppSyncAPI();
    this.createLambdas();
    this.createDynamoDBTables();
    this.createResolvers();
    this.grantPermissions();
  }

  createDynamoDBTables() {
    this.customerTable = new dynamodb.Table(
      this,
      'ottofeller-dynamodb-table-customer',
      {
        tableName: 'ottofeller-dynamodb-table-customer',
        tableClass: TableClass.STANDARD,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: false,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    this.customerTable.grantFullAccess(this.orderLambda);

    this.orderTable = new dynamodb.Table(
      this,
      'ottofeller-dynamodb-table-order',
      {
        tableName: 'ottofeller-dynamodb-table-order',
        tableClass: TableClass.STANDARD,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: false,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    this.orderTable.grantFullAccess(this.orderLambda);

    this.productTable = new dynamodb.Table(
      this,
      'ottofeller-dynamodb-table-product',
      {
        tableName: 'ottofeller-dynamodb-table-product',
        tableClass: TableClass.STANDARD,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: false,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    this.productTable.grantFullAccess(this.orderLambda);
  }

  createAppSyncAPI() {
    this.api = new appsync.GraphqlApi(this, 'ottofeller-GraphQLAPI', {
      name: 'ottofeller-appsync-api',
      schema: appsync.SchemaFile.fromAsset('src/graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(30)),
          },
        },
      },
      xrayEnabled: false,
    });

    // Prints out the AppSync GraphQL endpoint to the terminal
    new CfnOutput(this, 'ottofeller-GraphQLAPIURL', {
      value: this.api.graphqlUrl,
    });

    // Prints out the AppSync GraphQL API key to the terminal
    new CfnOutput(this, 'ottofeller-GraphQLAPIKey', {
      value: this.api.apiKey || '',
    });
  }

  createLambdas() {
    this.orderLambda = new lambda.Function(this, 'ottofeller-AppSyncOrderHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset('lib/api/orders'),
      memorySize: 1024,
    });

    // Set the new Lambda function as a data source for the AppSync API
    this.orderLambdaDatasource = this.api.addLambdaDataSource('ottofeller-orderLambdaDatasource', this.orderLambda);
  }

  createResolvers() {
    this.orderLambdaDatasource.createResolver('ottofeller-listOrdersResolver', {
      typeName: 'Query',
      fieldName: 'orders',
    });
  }

  grantPermissions() {
    // Create an environment variable that we will use in the function code
    this.orderLambda.addEnvironment('ORDER_TABLE', this.orderTable.tableName);
    this.orderLambda.addEnvironment('CUSTOMER_TABLE', this.customerTable.tableName);
    this.orderLambda.addEnvironment('PRODUCT_TABLE', this.productTable.tableName);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'ottofeller-home-assignment-dev', { env: devEnv });

app.synth();