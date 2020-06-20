import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import ecr_assets = require('@aws-cdk/aws-ecr-assets');
import rds = require('@aws-cdk/aws-rds');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import ssm = require('@aws-cdk/aws-ssm');

interface TestRailsCdkDevelopmentFargateStackProps {
  vpc: ec2.IVpc,
  cluster: ecs.ICluster,
}

export class TestRailsCdkDevelopmentFargateStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly repoName: string;
  public readonly dbUrl: string;
  public readonly db: rds.DatabaseCluster;

  constructor(scope: cdk.App, id: string, props: TestRailsCdkDevelopmentFargateStackProps) {
    super(scope, id);

    // import resources
    const region = scope.region;
    const account = scope.account;
    const cluster = props.cluster;
    const vpc = props.vpc;

    // // Create secret from SecretsManager
    // const secretJson = secretsmanager.Secret.fromSecretAttributes(this, 'Secret', {
    //   secretArn: `arn:aws:secretsmanager:${region}:${account}:secret:test-arp-integ-E6Nr26` });
    // const dbUsername = secretJson.secretValueFromJson('username').toString();
    // const dbPassword = secretJson.secretValueFromJson('password').toString();
    // const dbHost = secretJson.secretValueFromJson('host').toString();
    // console.log('1. ======================================================================');
    // console.log(dbPassword);
    // console.log(dbHost);

    // const dbHost = ecs.Secret.fromSsmParameter(ssm.StringParameter.fromSecureStringParameterAttributes(this, 'Secrets-dbHost', { parameterName: '/rds/integ/host', version: 1 }))
    // const dbPassword = ecs.Secret.fromSsmParameter(ssm.StringParameter.fromSecureStringParameterAttributes(this, 'Secrets-dbHost', { parameterName: '/rds/integ/password', version: 1 }))
    const dbHost = process.env.DB_HOST ? process.env.DB_HOST : '';
    const dbPassword = process.env.DB_PASSWORD ? process.env.DB_PASSWORD : '';

    const asset = new ecr_assets.DockerImageAsset(this, 'ImageAssetBuild', {
      directory: '../.'
    });

    // compute repo name from asset image
    const parts = asset.imageUri.split("@")[0].split("/");
    const repoName = parts.slice(1, parts.length).join("/").split(":")[0];
    this.repoName = repoName;

    const image = ecs.ContainerImage.fromDockerImageAsset(asset);

    console.log('3. ======================================================================');
    // Fargate service
    const lbFargate = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'LBFargate', {
      serviceName: 'TestRailsCdkDevelopment',
      cluster: cluster,
      taskImageOptions: {
        image: image,
        containerName: 'FargateTaskContainer',
        containerPort: 80,
        environment: {
          'DB_USERNAME': 'postgres',
          'DB_PORT': '5432',
          'DB_DATABASE': 'development',
          'DB_HOST': dbHost,
          'DB_PASSWORD': dbPassword,
          'PORT': '80',
          'RAILS_LOG_TO_STDOUT': 'true',
          'RAILS_ENV': 'development',
        },
        enableLogging: true,
      },
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 2,
      publicLoadBalancer: true,
      assignPublicIp: true
    });
    // db.connections.allowDefaultPortFrom(lbFargate.service, 'From Fargate');
    // this.db = db;

    const scaling = lbFargate.service.autoScaleTaskCount({
      maxCapacity: 3,
    });

    this.service = lbFargate.service;
  }
}
