package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    // toDto() reads group.getId() and creator.getId() for every row -- join fetch avoids a
    // separate SELECT per event for each of those default-EAGER many-to-one associations.
    @Query("select e from Event e join fetch e.group join fetch e.creator where e.group.id = ?1")
    List<Event> findByGroup_Id(Long groupId);

    @Query("select e from Event e join fetch e.group join fetch e.creator where e.group.id = ?1 and e.weekNumber = ?2 and e.year = ?3")
    List<Event> findByGroup_IdAndWeekNumberAndYear(Long groupId, Integer weekNumber, Integer year);

    @Query("select e.weekNumber, e.year, count(e.id) from Event e where e.group.id = ?1 and e.weekNumber is not null and e.year is not null group by e.weekNumber, e.year order by e.year desc, e.weekNumber desc")
    List<Object[]> listWeeksWithCounts(Long groupId);
}
