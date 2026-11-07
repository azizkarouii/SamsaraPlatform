package com.samsara.dto;

import java.util.List;

public record PageDto<T>(List<T> content, long totalElements) {}
