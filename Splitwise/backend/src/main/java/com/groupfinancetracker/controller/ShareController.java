package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.ShareResponse;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ShareController {
    private final ShareService shareService;

    private Long currentUserId() {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        return details instanceof Long ? (Long) details : null;
    }

    @GetMapping("/api/subevents/{subEventId}/shares")
    public List<ShareResponse> listBySubEvent(@PathVariable Long subEventId) { return shareService.listBySubEvent(subEventId, currentUserId()); }

    @GetMapping("/api/users/{userId}/shares")
    public List<ShareResponse> listByUser(@PathVariable Long userId) {
        Long actorId = currentUserId();
        if (actorId == null || !actorId.equals(userId)) {
            throw new ForbiddenActionException("You can only view your own shares");
        }
        return shareService.listByUser(userId);
    }

    @GetMapping("/api/shares/{id}")
    public ShareResponse get(@PathVariable Long id) { return shareService.get(id, currentUserId()); }
}
