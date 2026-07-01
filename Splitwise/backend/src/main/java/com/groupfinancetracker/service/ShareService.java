package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.Share;
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

    public List<DtoModels.ShareResponse> listBySubEvent(Long subEventId) {
        if (!subEventRepository.existsById(subEventId)) throw new NotFoundException("SubEvent not found: " + subEventId);
        return shareRepository.findBySubEvent_Id(subEventId).stream().map(this::toDto).toList();
    }

    public List<DtoModels.ShareResponse> listByUser(Long userId) {
        return shareRepository.findByUser_Id(userId).stream().map(this::toDto).toList();
    }

    public DtoModels.ShareResponse get(Long id) {
        Share s = shareRepository.findById(id).orElseThrow(() -> new NotFoundException("Share not found: " + id));
        return toDto(s);
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
