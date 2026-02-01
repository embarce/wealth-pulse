package com.litchi.wealth.service.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * Cloudflare Turnstile 人机验证服务
 */
@Service
@Slf4j
public class CloudflareTurnstileService {

    private static final String VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${cloudflare.turnstile.enabled:true}")
    private boolean enabled;

    @Value("${cloudflare.turnstile.secret:}")
    private String secret;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean verify(String token) {
        if (!enabled) {
            return true;
        }
        if (StringUtils.isBlank(token)) {
            return false;
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secret);
            form.add("response", token);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(form, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(VERIFY_ENDPOINT, requestEntity, String.class);
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                return false;
            }
            JsonNode root = objectMapper.readTree(body);
            return root.path("success").asBoolean(false);
        } catch (Exception ex) {
            log.error("Turnstile verify error: {}", ex.getMessage());
            return false;
        }
    }
}



