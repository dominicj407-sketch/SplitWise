package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentStatusRepository extends JpaRepository<PaymentStatus, Long> {
    Optional<PaymentStatus> findByShare_Id(Long shareId);
}
