package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.CreateSubEventRequest;
import com.groupfinancetracker.dto.DtoModels.SubEventResponse;
import com.groupfinancetracker.service.SubEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SubEventController {
    private final SubEventService subEventService;

    @PostMapping("/api/subevents")
    public SubEventResponse create(@Valid @RequestBody CreateSubEventRequest req) {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getDetails() : null;
        Long actorId = details instanceof Long ? (Long) details : req.payerId();
        return subEventService.create(new CreateSubEventRequest(
                req.eventId(),
                req.description(),
                req.totalAmount(),
                actorId,
                req.subEventDate(),
                req.shares(),
                req.isRecurring(),
                req.recurringPeriod()
        ));
    }

    @GetMapping("/api/events/{eventId}/subevents")
    public List<SubEventResponse> listByEvent(@PathVariable Long eventId) { return subEventService.listByEvent(eventId); }

    @GetMapping("/api/subevents/{id}")
    public SubEventResponse get(@PathVariable Long id) { return subEventService.get(id); }
}
