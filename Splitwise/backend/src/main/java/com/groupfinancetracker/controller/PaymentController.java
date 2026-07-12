package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.ConfirmPaymentRequest;
import com.groupfinancetracker.dto.DtoModels.MarkPaymentRequest;
import com.groupfinancetracker.dto.DtoModels.ShareResponse;
import com.groupfinancetracker.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/mark-paid")
    public ShareResponse markPaid(@RequestBody Map<String, Object> body) {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getDetails() : null;
        Long actorId = details instanceof Long ? (Long) details : null;
        Number shareIdNum = (Number) body.get("shareId");
        Long shareId = shareIdNum != null ? shareIdNum.longValue() : null;
        String transactionRef = (String) body.get("transactionRef");
        String proofUrl = (String) body.get("proofUrl");
        return paymentService.markPaid(new MarkPaymentRequest(shareId, actorId, transactionRef, proofUrl));
    }

    @PostMapping("/confirm")
    public ShareResponse confirm(@RequestBody Map<String, Long> body) {
        Object details = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getDetails() : null;
        Long actorId = details instanceof Long ? (Long) details : null;
        Long shareId = body.get("shareId");
        return paymentService.confirm(new ConfirmPaymentRequest(shareId, actorId));
    }

    @PostMapping("/settle-pairwise")
    public void settlePairwise(@RequestBody Map<String, Object> body) {
        Number groupVal = (Number) body.get("groupId");
        Number eventVal = (Number) body.get("eventId");
        Number debtorVal = (Number) body.get("debtorId");
        Number creditorVal = (Number) body.get("creditorId");

        Number amountVal = (Number) body.get("amount");

        Long groupId = groupVal != null ? groupVal.longValue() : null;
        Long eventId = eventVal != null ? eventVal.longValue() : null;
        Long debtorId = debtorVal != null ? debtorVal.longValue() : null;
        Long creditorId = creditorVal != null ? creditorVal.longValue() : null;
        java.math.BigDecimal amount = amountVal != null ? new java.math.BigDecimal(amountVal.toString()) : null;

        Object details = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getDetails()
                : null;
        Long actorId = details instanceof Long ? (Long) details : null;
        paymentService.settlePairwise(groupId, eventId, debtorId, creditorId, amount, actorId);
    }
}
