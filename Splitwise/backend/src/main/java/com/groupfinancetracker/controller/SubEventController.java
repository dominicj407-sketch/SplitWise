package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.CreateSubEventRequest;
import com.groupfinancetracker.dto.DtoModels.UpdateSubEventRequest;
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

    private Long currentUserId() {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        return details instanceof Long ? (Long) details : null;
    }

    @PostMapping("/api/subevents")
    public SubEventResponse create(@Valid @RequestBody CreateSubEventRequest req) {
        // Honor the selected payer (req.payerId); do not force the logged-in user.
        return subEventService.create(req);
    }

    @PutMapping("/api/subevents/{id}")
    public SubEventResponse update(@PathVariable Long id, @Valid @RequestBody UpdateSubEventRequest req) {
        return subEventService.update(id, req, currentUserId());
    }

    @DeleteMapping("/api/subevents/{id}")
    public void delete(@PathVariable Long id) {
        subEventService.delete(id, currentUserId());
    }

    @GetMapping("/api/events/{eventId}/subevents")
    public List<SubEventResponse> listByEvent(@PathVariable Long eventId) { return subEventService.listByEvent(eventId); }

    @GetMapping("/api/subevents/{id}")
    public SubEventResponse get(@PathVariable Long id) { return subEventService.get(id); }
}
