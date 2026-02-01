package com.litchi.wealth.utils;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author Embrace
 * @Classname EmailUtils
 * @Description EmailUtils
 * @Date 2024/1/21 23:45
 * @git: https://github.com/embarce
 */
@Component
public class EmailUtils {

    /**
     * from
     */
    @Value("${resend.from}")
    private String from;

    /**
     * resend
     */
    @Value("${resend.key}")
    private String resendKey;

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{([^}]+)}}");

    private static final Logger logger = LoggerFactory.getLogger(EmailUtils.class);


    private String readHtmlTemplate(String templateName) throws IOException {
        // 从类路径下读取HTML模板
        ClassPathResource resource = new ClassPathResource("templates/" + templateName + ".html");
        byte[] contentBytes = new byte[(int) resource.contentLength()];
        resource.getInputStream().read(contentBytes);
        return new String(contentBytes, StandardCharsets.UTF_8);
    }


    public void sendEmailByResend(String to, String subject, String templateName, Map<String, String> mapping) {
        try {
            Resend resend = new Resend(resendKey);
            String htmlContent = readHtmlTemplate(templateName);
            String emailContent = replaceVariables(htmlContent, mapping);
            CreateEmailOptions sendEmailRequest = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(emailContent)
                    .build();
            CreateEmailResponse send = resend.emails().send(sendEmailRequest);
            logger.info("resend data id:{}", send.getId());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static String replaceVariables(String template, Map<String, String> map) {
        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = map.getOrDefault("{{" + key + "}}", "");
            matcher.appendReplacement(buffer, value);
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }
}
