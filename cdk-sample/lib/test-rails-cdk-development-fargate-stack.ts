import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import ecr_assets = require('@aws-cdk/aws-ecr-assets');
import rds = require('@aws-cdk/aws-rds');
import secretsmanager = require('@aws-cdk/aws-secretsmanager');

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

    // Create secret from SecretsManager
    const secretJson = secretsmanager.Secret.fromSecretAttributes(this, 'Secret', {
      secretArn: `arn:aws:secretsmanager:${region}:${account}:secret:test-arp-integ-E6Nr26`
    })
    const username = secretJson.secretValueFromJson('username').toString();
    const password = secretJson.secretValueFromJson('password').toString();
    const host = secretJson.secretValueFromJson('host').toString();

    const asset = new ecr_assets.DockerImageAsset(this, 'ImageAssetBuild', {
      directory: '../.'
    });

    // compute repo name from asset image
    const parts = asset.imageUri.split("@")[0].split("/");
    const repoName = parts.slice(1, parts.length).join("/").split(":")[0];
    this.repoName = repoName;

    const image = ecs.ContainerImage.fromDockerImageAsset(asset);

    // Fargate service
    const lbFargate = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'LBFargate', {
      serviceName: 'TestRailsCdkDevelopment',
      cluster: cluster,
      taskImageOptions: {
        image: image,
        containerName: 'FargateTaskContainer',
        containerPort: 80,
        environment: {
          'DATABASE_HOST': host,
          'DATABASE_USERNAME': username,
          'DATABASE_PASSWORD': password,
          'DATABASE_PORT': '5432',
          'DATABASE': 'development',
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
