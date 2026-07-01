package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.ShareResponse;
import com.groupfinancetracker.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ShareController {
    private final ShareService shareService;

    @GetMapping("/api/subevents/{subEventId}/shares")
    public List<ShareResponse> listBySubEvent(@PathVariable Long subEventId) { return shareService.listBySubEvent(subEventId); }

    @GetMapping("/api/users/{userId}/shares")
    public List<ShareResponse> listByUser(@PathVariable Long userId) { return shareService.listByUser(userId); }

    @GetMapping("/api/shares/{id}")
    public ShareResponse get(@PathVariable Long id) { return shareService.get(id); }
}
