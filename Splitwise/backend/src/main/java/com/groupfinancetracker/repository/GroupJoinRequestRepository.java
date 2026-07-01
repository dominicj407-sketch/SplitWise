package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.GroupJoinRequest;
import com.groupfinancetracker.entity.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Long> {
    Optional<GroupJoinRequest> findByGroupCodeAndRequester_IdAndStatus(String groupCode, Long requesterId,
            JoinRequestStatus status);

    Optional<GroupJoinRequest> findByIdAndGroup_Id(Long id, Long groupId);

    List<GroupJoinRequest> findByGroup_IdAndStatus(Long groupId, JoinRequestStatus status);

    List<GroupJoinRequest> findByRequester_IdAndStatus(Long requesterId, JoinRequestStatus status);

    List<GroupJoinRequest> findByGroup_Creator_IdAndStatus(Long creatorId, JoinRequestStatus status);
}
