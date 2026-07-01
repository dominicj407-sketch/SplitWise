package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.CreateEventRequest;
import com.groupfinancetracker.dto.DtoModels.EventResponse;
import com.groupfinancetracker.dto.DtoModels.WeekSummary;
import com.groupfinancetracker.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;

    @PostMapping("/api/events")
    public EventResponse create(@Valid @RequestBody CreateEventRequest req) {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        Long actorId = details instanceof Long ? (Long) details : req.creatorId();
        return eventService
                .create(new CreateEventRequest(req.groupId(), req.name(), actorId, req.startDate(), req.endDate()));
    }

    @GetMapping("/api/groups/{groupId}/events")
    public List<EventResponse> listByGroup(@PathVariable Long groupId) {
        return eventService.listByGroup(groupId);
    }

    @GetMapping("/api/groups/{groupId}/events/by-week")
    public List<EventResponse> listByWeek(@PathVariable Long groupId, @RequestParam("week") Integer weekNumber,
            @RequestParam("year") Integer year) {
        return eventService.listByGroupWeek(groupId, weekNumber, year);
    }

    @GetMapping("/api/groups/{groupId}/weeks")
    public List<WeekSummary> listWeeks(@PathVariable Long groupId) {
        return eventService.listWeeks(groupId);
    }

    @GetMapping("/api/events/{id}")
    public EventResponse get(@PathVariable Long id) {
        return eventService.get(id);
    }

    @DeleteMapping("/api/events/{id}")
    public void delete(@PathVariable Long id) {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        Long actorId = details instanceof Long ? (Long) details : null;
        eventService.delete(id, actorId);
    }
}
