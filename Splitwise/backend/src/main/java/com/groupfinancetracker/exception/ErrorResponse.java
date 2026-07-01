package com.groupfinancetracker.exception;

import java.time.Instant;

public record ErrorResponse(int code, String message, Instant timestamp) { }
