package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.GroupInvitation;
import com.groupfinancetracker.entity.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    List<GroupInvitation> findByInvitedUserIdAndStatus(Long invitedUserId, JoinRequestStatus status);

    Optional<GroupInvitation> findByGroupIdAndInvitedUserIdAndStatus(Long groupId, Long invitedUserId,
            JoinRequestStatus status);

    List<GroupInvitation> findByGroupId(Long groupId);
}
