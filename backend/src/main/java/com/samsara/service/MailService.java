package com.samsara.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Sends the emails of the app. Without a mail server (local development), the message is written to the log. */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${application.mail.from}")
    private String from;

    public void send(String to, String subject, String text) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No mail server configured (spring.mail.host). Email to {} - {}:\n{}", to, subject, text);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Could not send the email \"{}\" to {}", subject, to, e);
        }
    }
}
