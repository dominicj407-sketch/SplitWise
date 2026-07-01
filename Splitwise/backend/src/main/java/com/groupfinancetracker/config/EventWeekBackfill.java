package com.groupfinancetracker.config;

import com.groupfinancetracker.entity.Event;
import com.groupfinancetracker.repository.EventRepository;
import com.groupfinancetracker.repository.SubEventRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class EventWeekBackfill {
    private final EventRepository eventRepository;
    private final SubEventRepository subEventRepository;

    @PostConstruct
    public void backfill() {
        try {
            List<Event> events = eventRepository.findAll();
            LocalDate base = subEventRepository.findEarliestSubEventDate();
            for (Event e : events) {
                if (e.getWeekNumber() != null && e.getYear() != null)
                    continue;
                LocalDate date = e.getStartDate();
                if (date == null && e.getCreatedAt() != null) {
                    date = e.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                }
                if (date == null)
                    continue; // cannot assign without any date
                LocalDate b = base != null ? base : date;
                int weekIndex = (int) ChronoUnit.WEEKS.between(b, date) + 1;
                if (weekIndex < 1)
                    weekIndex = 1;
                e.setWeekNumber(weekIndex);
                e.setYear(1);
                eventRepository.save(e);
            }
        } catch (Exception ignored) {
        }
    }
}
