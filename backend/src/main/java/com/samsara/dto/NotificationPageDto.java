package com.samsara.dto;

import com.samsara.entity.Notification;

import java.util.List;

public record NotificationPageDto(List<Notification> content, long totalElements) {}
