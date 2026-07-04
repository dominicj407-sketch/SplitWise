package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findByGroup_Id(Long groupId);
    List<Settlement> findByEvent_Id(Long eventId);
    List<Settlement> findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(Long groupId, Integer weekNumber, Integer year);
    boolean existsByGroup_IdAndFromUser_IdAndToUser_IdAndAmount(Long groupId, Long fromId, Long toId, BigDecimal amount);
}
