package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Share;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ShareRepository extends JpaRepository<Share, Long> {
    List<Share> findBySubEvent_Id(Long subEventId);
    List<Share> findByUser_Id(Long userId);

    // Settlement calculations (groupPairwise/weeklySettlements/groupSummary/groupLedger) walk
    // subEvent.payer, user and paymentStatus for every row -- without join fetch, Hibernate's
    // default EAGER many-to-one mappings resolve each of those via a separate SELECT per row.
    @Query("select s from Share s join fetch s.subEvent se join fetch se.payer join fetch s.user left join fetch s.paymentStatus where se.event.group.id = ?1")
    List<Share> findBySubEvent_Event_Group_Id(Long groupId);

    @Query("select s from Share s join fetch s.subEvent se join fetch se.payer join fetch s.user left join fetch s.paymentStatus where se.event.group.id = ?1 and se.weekNumber = ?2 and se.year = ?3")
    List<Share> findBySubEvent_Event_Group_IdAndSubEvent_WeekNumberAndSubEvent_Year(Long groupId, Integer weekNumber, Integer year);

    List<Share> findByUser_IdAndPaymentStatus_StatusNot(Long userId, PaymentState status);

    @Query("select s from Share s join fetch s.subEvent se join fetch se.payer join fetch s.user left join fetch s.paymentStatus where se.event.id = ?1")
    List<Share> findBySubEvent_Event_Id(Long eventId);
}
