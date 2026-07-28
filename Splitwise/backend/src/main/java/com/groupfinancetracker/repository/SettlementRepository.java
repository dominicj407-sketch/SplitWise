package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    // toLedgerEntry()/toSettlementRows() read fromUser and toUser (id + name) for every row --
    // join fetch avoids a separate SELECT per settlement for each association.
    @Query("select s from Settlement s join fetch s.fromUser join fetch s.toUser where s.group.id = ?1")
    List<Settlement> findByGroup_Id(Long groupId);

    @Query("select s from Settlement s join fetch s.fromUser join fetch s.toUser where s.group.id = ?1 and s.status = ?2")
    List<Settlement> findByGroup_IdAndStatus(Long groupId, PaymentState status);
    List<Settlement> findByEvent_Id(Long eventId);
    List<Settlement> findBySubEvent_Id(Long subEventId);
    void deleteBySubEvent_Id(Long subEventId);
    void deleteByEvent_Id(Long eventId);
    List<Settlement> findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(Long groupId, Integer weekNumber, Integer year);
    boolean existsByGroup_IdAndFromUser_IdAndToUser_IdAndAmount(Long groupId, Long fromId, Long toId, BigDecimal amount);
}
