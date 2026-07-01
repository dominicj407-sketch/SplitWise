package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Share;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShareRepository extends JpaRepository<Share, Long> {
    List<Share> findBySubEvent_Id(Long subEventId);
    List<Share> findByUser_Id(Long userId);
    List<Share> findBySubEvent_Event_Group_Id(Long groupId);
    List<Share> findBySubEvent_Event_Group_IdAndSubEvent_WeekNumberAndSubEvent_Year(Long groupId, Integer weekNumber, Integer year);
    List<Share> findByUser_IdAndPaymentStatus_StatusNot(Long userId, PaymentState status);
    List<Share> findBySubEvent_Event_Id(Long eventId);
}
