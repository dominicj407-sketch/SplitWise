package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.*;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.GroupJoinRequestRepository;
import com.groupfinancetracker.repository.GroupRepository;
import com.groupfinancetracker.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupJoinService {
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupJoinRequestRepository joinRepo;

    public DtoModels.GenerateGroupCodeResponse generateCode(@NonNull Long groupId, @NonNull Long actorUserId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        if (!g.getCreator().getId().equals(actorUserId))
            throw new ForbiddenActionException("Only creator can generate code");
        if (g.getGroupCode() != null && !g.getGroupCode().isBlank()) {
            throw new ForbiddenActionException("Group code is immutable and already set");
        }
        String code = generateUniqueCode();
        g.setGroupCode(code);
        groupRepository.save(g);
        return new DtoModels.GenerateGroupCodeResponse(g.getId(), code);
    }

    public DtoModels.GroupCodeResponse getCode(@NonNull Long groupId, @NonNull Long actorUserId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        boolean isMember = g.getMembers().stream().anyMatch(u -> u.getId().equals(actorUserId))
                || g.getCreator().getId().equals(actorUserId);
        if (!isMember)
            throw new ForbiddenActionException("Only members can view code");
        return new DtoModels.GroupCodeResponse(g.getId(), g.getGroupCode());
    }

    public DtoModels.JoinRequestResponse submitJoin(@NonNull DtoModels.SubmitJoinRequest req) {
        Group g = groupRepository.findByGroupCode(req.groupCode())
                .orElseThrow(() -> new NotFoundException("Invalid group code"));
        User requester = userRepository.findById(req.userId())
                .orElseThrow(() -> new NotFoundException("User not found: " + req.userId()));
        boolean alreadyMember = g.getMembers().stream().anyMatch(u -> u.getId().equals(req.userId()))
                || g.getCreator().getId().equals(req.userId());
        if (alreadyMember)
            throw new IllegalStateException("Already a member of this group");
        var dup = joinRepo.findByGroupCodeAndRequester_IdAndStatus(req.groupCode(), req.userId(),
                JoinRequestStatus.PENDING);
        if (dup.isPresent())
            throw new IllegalStateException("Duplicate pending request");
        GroupJoinRequest jr = GroupJoinRequest.builder()
                .groupCode(req.groupCode())
                .group(g)
                .requester(requester)
                .status(JoinRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();
        jr = java.util.Objects.requireNonNull(joinRepo.save(jr));
        return toDto(jr);
    }

    public List<DtoModels.JoinRequestResponse> listPendingForGroup(@NonNull Long groupId, @NonNull Long actorUserId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        if (!g.getCreator().getId().equals(actorUserId))
            throw new ForbiddenActionException("Only creator can view join requests");
        return joinRepo.findByGroup_IdAndStatus(groupId, JoinRequestStatus.PENDING).stream().map(this::toDto).toList();
    }

    public DtoModels.JoinRequestResponse approve(@NonNull Long groupId, @NonNull Long requestId,
            @NonNull Long actorUserId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        if (!g.getCreator().getId().equals(actorUserId))
            throw new ForbiddenActionException("Only creator can approve");
        GroupJoinRequest jr = joinRepo.findByIdAndGroup_Id(requestId, groupId)
                .orElseThrow(() -> new NotFoundException("Join request not found: " + requestId));
        if (jr.getStatus() != JoinRequestStatus.PENDING)
            return toDto(jr);
        jr.setStatus(JoinRequestStatus.APPROVED);
        jr.setRespondedAt(LocalDateTime.now());
        jr.setRespondedBy(g.getCreator());
        joinRepo.save(jr);
        // add member
        Group group = jr.getGroup();
        group.getMembers().add(jr.getRequester());
        groupRepository.save(group);
        return toDto(jr);
    }

    public DtoModels.JoinRequestResponse reject(@NonNull Long groupId, @NonNull Long requestId,
            @NonNull Long actorUserId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        if (!g.getCreator().getId().equals(actorUserId))
            throw new ForbiddenActionException("Only creator can reject");
        GroupJoinRequest jr = joinRepo.findByIdAndGroup_Id(requestId, groupId)
                .orElseThrow(() -> new NotFoundException("Join request not found: " + requestId));
        if (jr.getStatus() != JoinRequestStatus.PENDING)
            return toDto(jr);
        jr.setStatus(JoinRequestStatus.REJECTED);
        jr.setRespondedAt(LocalDateTime.now());
        jr.setRespondedBy(g.getCreator());
        joinRepo.save(jr);
        return toDto(jr);
    }

    public List<DtoModels.JoinRequestResponse> listPendingForUser(@NonNull Long userId) {
        return joinRepo.findByRequester_IdAndStatus(userId, JoinRequestStatus.PENDING).stream().map(this::toDto)
                .toList();
    }

    public List<DtoModels.JoinRequestResponse> listPendingForCreator(@NonNull Long creatorId) {
        return joinRepo.findByGroup_Creator_IdAndStatus(creatorId, JoinRequestStatus.PENDING).stream().map(this::toDto)
                .toList();
    }

    private String generateUniqueCode() {
        SecureRandom rnd = new SecureRandom();
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder();
            int len = 8 + rnd.nextInt(3); // 8-10
            for (int i = 0; i < len; i++)
                sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
            String code = sb.toString().toUpperCase(Locale.ROOT);
            if (!groupRepository.existsByGroupCode(code))
                return code;
        }
        // Safe fallback: fixed length with GRP prefix
        while (true) {
            StringBuilder sb = new StringBuilder(10);
            sb.append('G').append('R').append('P');
            for (int i = 0; i < 7; i++)
                sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
            String code = sb.toString();
            if (!groupRepository.existsByGroupCode(code))
                return code;
        }
    }

    private DtoModels.JoinRequestResponse toDto(GroupJoinRequest jr) {
        return new DtoModels.JoinRequestResponse(
                jr.getId(),
                jr.getGroup().getId(),
                jr.getGroupCode(),
                jr.getRequester().getId(),
                jr.getStatus().name(),
                jr.getRequestedAt(),
                jr.getRespondedAt(),
                jr.getRespondedBy() != null ? jr.getRespondedBy().getId() : null);
    }
}
