package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.Group;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.entity.SubEvent;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.SubEventRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ShareService {
    private final ShareRepository shareRepository;
    private final SubEventRepository subEventRepository;

    public List<DtoModels.ShareResponse> listBySubEvent(Long subEventId, Long actorId) {
        SubEvent se = subEventRepository.findById(subEventId)
                .orElseThrow(() -> new NotFoundException("SubEvent not found: " + subEventId));
        requireMember(se, actorId);
        return shareRepository.findBySubEvent_Id(subEventId).stream().map(this::toDto).toList();
    }

    public List<DtoModels.ShareResponse> listByUser(Long userId) {
        return shareRepository.findByUser_Id(userId).stream().map(this::toDto).toList();
    }

    public DtoModels.ShareResponse get(Long id, Long actorId) {
        Share s = shareRepository.findById(id).orElseThrow(() -> new NotFoundException("Share not found: " + id));
        requireMember(s.getSubEvent(), actorId);
        return toDto(s);
    }

    private void requireMember(SubEvent se, Long actorId) {
        Group g = se.getEvent().getGroup();
        boolean isMember = actorId != null && (g.getCreator().getId().equals(actorId)
                || g.getMembers().stream().anyMatch(u -> u.getId().equals(actorId)));
        if (!isMember) {
            throw new ForbiddenActionException("Only group members can view these shares");
        }
    }

    public DtoModels.ShareResponse toDto(Share s) {
        return new DtoModels.ShareResponse(
                s.getId(),
                s.getSubEvent().getId(),
                s.getUser().getId(),
                s.getUser().getName(),
                s.getUser().getUpiId(),
                s.getSubEvent().getPayer().getId(),
                s.getAmount(),
                s.getPaymentStatus() != null ? s.getPaymentStatus().getStatus() : null,
                s.getPaymentStatus() != null ? s.getPaymentStatus().getMarkedAt() : null,
                s.getPaymentStatus() != null ? s.getPaymentStatus().getConfirmedAt() : null,
                s.getPaymentStatus() != null ? s.getPaymentStatus().getTransactionRef() : null,
                s.getPaymentStatus() != null ? s.getPaymentStatus().getProofUrl() : null
        );
    }
}
