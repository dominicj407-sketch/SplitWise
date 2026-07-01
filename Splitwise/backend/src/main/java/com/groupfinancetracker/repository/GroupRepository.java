package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    List<Group> findAllByMembers_Id(Long userId);
    Optional<Group> findByGroupCode(String groupCode);
    boolean existsByGroupCode(String groupCode);
}
