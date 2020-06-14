#!/usr/bin/env node

import cdk = require('@aws-cdk/core');
import { CdkSampleInitStack } from '../lib/cdk-sample-init-stack';
import { TestRailsCdkDevelopmentFargateStack } from '../lib/test-rails-cdk-development-fargate-stack';

const app = new cdk.App();
const initStack = new CdkSampleInitStack(app, 'CdkSampleInitStack');

// for service :test_rails_cdk_development
new TestRailsCdkDevelopmentFargateStack(app, 'TestRailsCdkDevelopmentFargateStack', {
    vpc: initStack.vpc,
    cluster: initStack.cluster
});


app.synth();
