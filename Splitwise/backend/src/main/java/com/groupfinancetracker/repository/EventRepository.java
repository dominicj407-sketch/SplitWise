package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByGroup_Id(Long groupId);
    List<Event> findByGroup_IdAndWeekNumberAndYear(Long groupId, Integer weekNumber, Integer year);

    @Query("select e.weekNumber, e.year, count(e.id) from Event e where e.group.id = ?1 and e.weekNumber is not null and e.year is not null group by e.weekNumber, e.year order by e.year desc, e.weekNumber desc")
    List<Object[]> listWeeksWithCounts(Long groupId);
}
