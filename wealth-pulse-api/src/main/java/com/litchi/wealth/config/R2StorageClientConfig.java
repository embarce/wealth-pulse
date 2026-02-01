package com.litchi.wealth.config;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * @author Embrace
 * @Classname R2StorageApi
 * @Description R2StorageApi
 * @Date 2024/1/29 23:46
 * @git: https://github.com/embarce
 */
@Component
public class R2StorageClientConfig {

    @Value("${cloudflare.R2.endpoint}")
    private String endpoint;
    @Value("${cloudflare.R2.accessKey}")
    private String accessKey;
    @Value("${cloudflare.R2.secretKey}")
    private String secretKey;

    @Value("${cloudflare.R2.region}")
    private String region;


    @Bean(name = "r2AmazonS3")
    @Primary
    public AmazonS3 amazonS3() {
        AwsClientBuilder.EndpointConfiguration auto = new AwsClientBuilder.EndpointConfiguration(endpoint, region);
        AWSStaticCredentialsProvider awsStaticCredentialsProvider = new AWSStaticCredentialsProvider(new BasicAWSCredentials(accessKey, secretKey));
        return AmazonS3ClientBuilder.standard()
                .withEndpointConfiguration(auto)
                .withCredentials(awsStaticCredentialsProvider)
                .build();
    }
}
