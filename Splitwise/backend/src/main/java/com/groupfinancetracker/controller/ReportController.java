package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.WeeklyReportItem;
import com.groupfinancetracker.service.SubEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final SubEventService subEventService;

    /** Always reports for the authenticated user; a client-supplied userId is ignored (prevents IDOR). */
    @GetMapping("/weekly")
    public List<WeeklyReportItem> getWeeklyReport() {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        Long targetUserId = details instanceof Long ? (Long) details : null;
        if (targetUserId == null) {
            throw new IllegalArgumentException("Not authenticated");
        }
        return subEventService.getWeeklyReport(targetUserId);
    }
}
