package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.WeeklyReportItem;
import com.groupfinancetracker.service.SubEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final SubEventService subEventService;

    @GetMapping("/weekly")
    public List<WeeklyReportItem> getWeeklyReport(@RequestParam(value = "userId", required = false) Long userId) {
        Long targetUserId = userId;
        if (targetUserId == null) {
            Object details = SecurityContextHolder.getContext().getAuthentication() != null
                    ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                    : null;
            if (details instanceof Long) {
                targetUserId = (Long) details;
            }
        }
        if (targetUserId == null) {
            throw new IllegalArgumentException("User ID must be provided or authenticated");
        }
        return subEventService.getWeeklyReport(targetUserId);
    }
}
