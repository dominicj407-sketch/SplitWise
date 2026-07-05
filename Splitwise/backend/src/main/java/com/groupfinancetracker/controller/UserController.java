package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.CreateUserRequest;
import com.groupfinancetracker.dto.DtoModels.UserResponse;
import com.groupfinancetracker.dto.DtoModels.JoinRequestResponse;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.service.UserService;
import com.groupfinancetracker.service.GroupJoinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final GroupJoinService groupJoinService;

    private Long currentUserId() {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        return details instanceof Long ? (Long) details : null;
    }

    @PostMapping
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) { return userService.create(req); }

    @GetMapping
    public List<UserResponse> list() { return userService.list(); }

    @GetMapping("/search")
    public List<UserResponse> search(@RequestParam("q") String query) {
        return userService.search(query);
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) { return userService.get(id); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        Long actorId = currentUserId();
        if (actorId == null || !actorId.equals(id)) {
            throw new ForbiddenActionException("You can only delete your own account");
        }
        userService.delete(id);
    }

    @PutMapping("/{id}")
    public UserResponse updateProfile(@PathVariable Long id, @Valid @RequestBody com.groupfinancetracker.dto.DtoModels.UpdateProfileRequest req) {
        Long actorId = currentUserId();
        if (actorId == null || !actorId.equals(id)) {
            throw new ForbiddenActionException("You can only update your own profile");
        }
        return userService.updateProfile(id, req);
    }

    @GetMapping("/{userId}/join-requests")
    public List<JoinRequestResponse> userJoinRequests(@PathVariable Long userId) {
        return groupJoinService.listPendingForUser(userId);
    }
}
