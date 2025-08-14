from datetime import datetime, timedelta
import pandas as pd
from typing import List, Dict, Tuple

class WeddingScheduleCreator:
    def __init__(self):
        self.artists = []
        self.clients = []
        self.appointments = []
        self.default_times = {
            'makeup': timedelta(minutes=45),
            'hair': timedelta(minutes=30)
        }
    
    def add_artist(self, name: str, specialties: List[str]) -> None:
        """Add a new artist to the schedule"""
        self.artists.append({
            'name': name,
            'specialties': specialties,
            'availability': []
        })
    
    def add_client(self, name: str, services: List[str], preferred_time: datetime) -> None:
        """Add a new client with their requested services"""
        self.clients.append({
            'name': name,
            'services': services,
            'preferred_time': preferred_time,
            'estimated_time': self._calculate_estimated_time(services)
        })
    
    def _calculate_estimated_time(self, services: List[str]) -> timedelta:
        """Calculate total estimated time for all services"""
        total_time = timedelta()
        for service in services:
            total_time += self.default_times.get(service, timedelta(minutes=30))
        return total_time
    
    def create_schedule(self) -> pd.DataFrame:
        """Create the wedding day schedule"""
        # Sort clients by preferred time
        self.clients.sort(key=lambda x: x['preferred_time'])
        
        # Create schedule
        for client in self.clients:
            # Find suitable artist
            for artist in self.artists:
                if all(service in artist['specialties'] for service in client['services']):
                    # Check availability
                    if not artist['availability']:
                        # First appointment
                        start_time = client['preferred_time']
                    else:
                        # Find next available slot
                        last_appointment = artist['availability'][-1]
                        start_time = last_appointment['end_time']
                    
                    # Create appointment
                    end_time = start_time + client['estimated_time']
                    appointment = {
                        'client': client['name'],
                        'artist': artist['name'],
                        'services': client['services'],
                        'start_time': start_time,
                        'end_time': end_time
                    }
                    
                    # Add to artist's availability
                    artist['availability'].append(appointment)
                    self.appointments.append(appointment)
                    break
        
        # Convert to DataFrame
        df = pd.DataFrame(self.appointments)
        df['start_time'] = df['start_time'].dt.strftime('%I:%M %p')
        df['end_time'] = df['end_time'].dt.strftime('%I:%M %p')
        return df
    
    def print_schedule(self) -> None:
        """Print the schedule in a readable format"""
        df = self.create_schedule()
        print("\nWedding Day Beauty Schedule:\n")
        print(df[['client', 'artist', 'services', 'start_time', 'end_time']].to_string(index=False))

def main():
    # Example usage
    scheduler = WeddingScheduleCreator()
    
    # Add artists
    scheduler.add_artist("Sarah", ["makeup", "hair"])
    scheduler.add_artist("Emily", ["makeup"])
    scheduler.add_artist("James", ["hair"])
    
    # Add clients
    wedding_day = datetime(2025, 8, 14)
    scheduler.add_client("Bride", ["makeup", "hair"], wedding_day + timedelta(hours=8))
    scheduler.add_client("Mother of Bride", ["makeup"], wedding_day + timedelta(hours=7))
    scheduler.add_client("Mother of Groom", ["makeup"], wedding_day + timedelta(hours=7, minutes=30))
    
    # Print schedule
    scheduler.print_schedule()

if __name__ == "__main__":
    main()
