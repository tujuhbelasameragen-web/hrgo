import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const response = await api.get(`/calendar/events?start_date=${start}&end_date=${end}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = getDay(monthStart);
  
  // Create blank cells for days before the first of the month
  const blankDays = Array(startDayOfWeek).fill(null);
  const allDays = [...blankDays, ...daysInMonth];

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return date >= eventStart && date <= eventEnd;
    });
  };

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Kalender
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lihat jadwal cuti dan lembur tim
          </p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
              data-testid="prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl font-['Manrope']">
              {format(currentDate, 'MMMM yyyy', { locale: id })}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
              data-testid="next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Week Days Header */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {allDays.map((day, index) => {
                  if (!day) {
                    return <div key={`blank-${index}`} className="aspect-square" />;
                  }

                  const dayEvents = getEventsForDay(day);
                  const isCurrentDay = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        aspect-square p-1 border rounded-lg
                        ${isCurrentDay ? 'border-primary bg-primary/5' : 'border-border'}
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                      `}
                      data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className={`
                        text-sm font-medium mb-1
                        ${isCurrentDay ? 'text-primary' : 'text-foreground'}
                      `}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event, idx) => (
                          <div
                            key={`${event.id}-${idx}`}
                            className="text-xs px-1 py-0.5 rounded truncate"
                            style={{ 
                              backgroundColor: `${event.color}20`,
                              color: event.color
                            }}
                            title={event.title}
                          >
                            {event.title.length > 10 
                              ? event.title.substring(0, 10) + '...'
                              : event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayEvents.length - 2} lagi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-sm text-muted-foreground">Cuti</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }} />
              <span className="text-sm text-muted-foreground">Lembur</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-['Manrope']">
              Jadwal Bulan {format(currentDate, 'MMMM yyyy', { locale: id })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start), 'd MMM', { locale: id })}
                      {event.start !== event.end && (
                        <> - {format(new Date(event.end), 'd MMM', { locale: id })}</>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary" style={{ backgroundColor: `${event.color}20`, color: event.color }}>
                    {event.type === 'leave' ? 'Cuti' : 'Lembur'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarPage;
