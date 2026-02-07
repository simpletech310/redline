#!/usr/bin/env python3
"""
REDLINE - Competitive Motorsports Platform
Terminal Demo v1.0

A complete demonstration of the Redline ecosystem including:
- Account types (Spectator, Jockey, Team Owner)
- Redline Cards & reputation system
- Garages, Loadouts, and equipment
- Runs (Races & Tournaments)
- Picks, Odds, and money flows
- Results and Trust scoring
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
from enum import Enum
import random

# Rich library for enhanced terminal output (with offline-safe fallback)
import importlib.util

if importlib.util.find_spec("rich") is not None:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
    from rich.layout import Layout
    from rich.text import Text
    from rich import box
    from rich.columns import Columns
    RICH_AVAILABLE = True
else:
    RICH_AVAILABLE = False

    class Console:
        def print(self, *args, **kwargs):
            print(*args)

        def clear(self):
            print("\n" * 2)

    class Panel:
        def __init__(self, renderable, title=None, border_style=None, padding=None):
            self.renderable = renderable
            self.title = title

        @staticmethod
        def fit(renderable, border_style=None):
            return renderable

        def __str__(self):
            return f"{self.title + chr(10) if self.title else ''}{self.renderable}"

    class Table:
        def __init__(self, title=None, box=None, show_header=True, header_style=None):
            self.title = title
            self.rows = []

        def add_column(self, *args, **kwargs):
            return None

        def add_row(self, *args, **kwargs):
            self.rows.append(args)

        def __str__(self):
            lines = [self.title] if self.title else []
            lines.extend(" | ".join(str(c) for c in row) for row in self.rows)
            return "\n".join(lines)

    class Prompt:
        @staticmethod
        def ask(prompt, choices=None, default=None):
            suffix = f" [{'/'.join(choices)}]" if choices else ""
            raw = input(f"{prompt}{suffix}: ").strip()
            if not raw and default is not None:
                return default
            return raw

    class Confirm:
        @staticmethod
        def ask(prompt, default=False):
            raw = input(f"{prompt} (y/n): ").strip().lower()
            if not raw:
                return default
            return raw in {"y", "yes"}

    class Layout:
        pass

    class Text(str):
        pass

    class _Box:
        SIMPLE = None
        ROUNDED = None

    box = _Box()

    class Columns(list):
        pass

console = Console()

# ============================================================================
# ENUMS & CONSTANTS
# ============================================================================

class AccountType(Enum):
    SPECTATOR = "Spectator"
    JOCKEY = "Jockey"
    TEAM_OWNER = "Team Owner"

class CardType(Enum):
    JOCKEY = "Jockey"
    TEAM = "Team"
    MACHINE = "Machine"

class RunType(Enum):
    RACE = "Race"
    TOURNAMENT = "Tournament"

class AccessType(Enum):
    NONE = "No Access"
    GENERAL = "General Access"
    VIP = "VIP Access"
    PIT = "Pit Access"
    RACER_ONLY = "Racer-Only"

class PickType(Enum):
    WINNER = "Winner"
    PODIUM = "Podium"
    TIME_BRACKET = "Time Bracket"

class MachineClass(Enum):
    STREET = "Street"
    SPORT = "Sport"
    PRO = "Pro"
    UNLIMITED = "Unlimited"

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class RedlineCard:
    """The core identity object"""
    card_id: str
    card_type: CardType
    name: str
    bio: str
    classes: List[str]
    stats: Dict[str, Any]
    history: List[Dict[str, Any]]
    trust_score: float = 100.0
    verified: bool = False
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

@dataclass
class Machine:
    """Vehicle in a garage"""
    machine_id: str
    name: str
    year: int
    make: str
    model: str
    machine_class: MachineClass
    engine: str
    parts: List[str]
    stats: Dict[str, Any]

@dataclass
class Loadout:
    """Locked configuration for a Run"""
    loadout_id: str
    machine: Machine
    configuration: Dict[str, Any]
    class_compliant: bool
    locked_at: str = ""
    
    def __post_init__(self):
        if not self.locked_at:
            self.locked_at = datetime.now().isoformat()

@dataclass
class RedlineWallet:
    """Money management"""
    wallet_id: str
    owner_id: str
    balance: float = 0.0
    transactions: List[Dict[str, Any]] = field(default_factory=list)
    
    def add_transaction(self, amount: float, description: str, transaction_type: str):
        self.balance += amount
        self.transactions.append({
            "amount": amount,
            "description": description,
            "type": transaction_type,
            "timestamp": datetime.now().isoformat(),
            "balance_after": self.balance
        })

@dataclass
class RedlinePick:
    """A spectator or jockey's prediction"""
    pick_id: str
    user_id: str
    run_id: str
    pick_type: PickType
    prediction: str  # jockey_id or time
    amount: float
    odds: float
    locked: bool = False
    won: Optional[bool] = None
    payout: float = 0.0

@dataclass
class RedlineRun:
    """Competition event"""
    run_id: str
    name: str
    run_type: RunType
    creator_id: str
    date_time: str
    location: str
    description: str
    machine_class: MachineClass
    entry_fee: float
    access_type: AccessType
    access_price: float
    participants: List[str]  # jockey_ids or team_ids
    picks_enabled: bool
    picks_locked: bool = False
    results_posted: bool = False
    results: Dict[str, Any] = field(default_factory=dict)
    current_odds: Dict[str, float] = field(default_factory=dict)

@dataclass
class Account:
    """User account"""
    user_id: str
    username: str
    account_type: AccountType
    email: str
    redline_card: Optional[RedlineCard] = None
    garage: List[Machine] = field(default_factory=list)
    wallet: Optional[RedlineWallet] = None
    team_members: List[str] = field(default_factory=list)  # For team owners
    team_owner_id: Optional[str] = None  # For jockeys on a team

# ============================================================================
# REDLINE PLATFORM - MAIN ENGINE
# ============================================================================

class RedlinePlatform:
    """The complete Redline system"""
    
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.runs: Dict[str, RedlineRun] = {}
        self.picks: Dict[str, RedlinePick] = {}
        self.current_user: Optional[Account] = None
        self.data_file = "redline_data.json"
        
        # Initialize with demo data
        self._init_demo_data()
    
    def _init_demo_data(self):
        """Create realistic demo data"""
        
        # === JOCKEYS ===
        
        # Marcus "Ghost" Rivera
        ghost_wallet = RedlineWallet("wallet_ghost", "jockey_ghost", 2450.00)
        ghost_card = RedlineCard(
            card_id="card_ghost",
            card_type=CardType.JOCKEY,
            name="Marcus 'Ghost' Rivera",
            bio="Street racing legend from Long Beach. Known for last-second passes and ice-cold consistency. 8-year veteran.",
            classes=["Street", "Sport"],
            stats={
                "total_runs": 47,
                "wins": 31,
                "podiums": 39,
                "best_time": "10.82s",
                "avg_time": "11.24s",
                "win_rate": "65.9%"
            },
            history=[
                {"date": "2024-12-15", "event": "SoCal Midnight Classic", "result": "1st", "time": "10.89s"},
                {"date": "2024-11-28", "event": "Harbor Showdown", "result": "2nd", "time": "11.12s"},
                {"date": "2024-11-10", "event": "Terminal Island Invitational", "result": "1st", "time": "10.82s"},
            ],
            trust_score=98.5,
            verified=True
        )
        
        ghost_machine = Machine(
            machine_id="machine_ghost_1",
            name="Black Mamba",
            year=1995,
            make="Nissan",
            model="240SX",
            machine_class=MachineClass.STREET,
            engine="SR20DET Turbo",
            parts=["Garrett GT3076R", "AEM Infinity", "Nismo 5-speed", "Coilovers"],
            stats={"hp": 480, "weight": 2650, "power_to_weight": 5.52}
        )
        
        ghost = Account(
            user_id="jockey_ghost",
            username="Ghost",
            account_type=AccountType.JOCKEY,
            email="ghost@redline.local",
            redline_card=ghost_card,
            garage=[ghost_machine],
            wallet=ghost_wallet
        )
        
        # Kenji "Apex" Tanaka
        apex_wallet = RedlineWallet("wallet_apex", "jockey_apex", 1820.00)
        apex_card = RedlineCard(
            card_id="card_apex",
            card_type=CardType.JOCKEY,
            name="Kenji 'Apex' Tanaka",
            bio="Technical driver from San Diego. Circuit experience translates to precision drag racing. Rising star.",
            classes=["Sport", "Pro"],
            stats={
                "total_runs": 34,
                "wins": 19,
                "podiums": 28,
                "best_time": "9.94s",
                "avg_time": "10.18s",
                "win_rate": "55.9%"
            },
            history=[
                {"date": "2024-12-20", "event": "San Diego Speed Festival", "result": "1st", "time": "9.94s"},
                {"date": "2024-12-01", "event": "Pacific Coast Challenge", "result": "3rd", "time": "10.23s"},
            ],
            trust_score=95.2,
            verified=True
        )
        
        apex_machine = Machine(
            machine_id="machine_apex_1",
            name="Crimson Dragon",
            year=2006,
            make="Mitsubishi",
            model="Evo IX",
            machine_class=MachineClass.SPORT,
            engine="4G63 Stroker",
            parts=["Precision 6266", "Haltech Elite", "Dodson Clutch", "Ohlins Coilovers"],
            stats={"hp": 620, "weight": 3100, "power_to_weight": 5.0}
        )
        
        apex = Account(
            user_id="jockey_apex",
            username="Apex",
            account_type=AccountType.JOCKEY,
            email="apex@redline.local",
            redline_card=apex_card,
            garage=[apex_machine],
            wallet=apex_wallet
        )
        
        # Sofia "Nitro" Valdez
        nitro_wallet = RedlineWallet("wallet_nitro", "jockey_nitro", 3100.00)
        nitro_card = RedlineCard(
            card_id="card_nitro",
            card_type=CardType.JOCKEY,
            name="Sofia 'Nitro' Valdez",
            bio="Only female in the top 10. Aggressive launches and perfect shifts. Earned every ounce of respect.",
            classes=["Street", "Sport", "Pro"],
            stats={
                "total_runs": 52,
                "wins": 36,
                "podiums": 45,
                "best_time": "9.71s",
                "avg_time": "10.01s",
                "win_rate": "69.2%"
            },
            history=[
                {"date": "2024-12-22", "event": "Valley Thunder", "result": "1st", "time": "9.88s"},
                {"date": "2024-12-10", "event": "LA Underground Series", "result": "1st", "time": "9.71s"},
                {"date": "2024-11-25", "event": "Midnight Mayhem", "result": "2nd", "time": "9.95s"},
            ],
            trust_score=99.1,
            verified=True
        )
        
        nitro_machine = Machine(
            machine_id="machine_nitro_1",
            name="Purple Reign",
            year=1998,
            make="Toyota",
            model="Supra",
            machine_class=MachineClass.PRO,
            engine="2JZ-GTE Big Single",
            parts=["Precision 7675", "Link G4X", "PPG Sequential", "KW V3"],
            stats={"hp": 940, "weight": 3200, "power_to_weight": 3.4}
        )
        
        nitro = Account(
            user_id="jockey_nitro",
            username="Nitro",
            account_type=AccountType.JOCKEY,
            email="nitro@redline.local",
            redline_card=nitro_card,
            garage=[nitro_machine],
            wallet=nitro_wallet
        )
        
        # Devon "Turbo" Jackson
        turbo_wallet = RedlineWallet("wallet_turbo", "jockey_turbo", 1650.00)
        turbo_card = RedlineCard(
            card_id="card_turbo",
            card_type=CardType.JOCKEY,
            name="Devon 'Turbo' Jackson",
            bio="Young gun from Compton. Raw talent meets calculated risk. Watch this space.",
            classes=["Street", "Sport"],
            stats={
                "total_runs": 28,
                "wins": 14,
                "podiums": 20,
                "best_time": "10.54s",
                "avg_time": "10.91s",
                "win_rate": "50.0%"
            },
            history=[
                {"date": "2024-12-18", "event": "Compton Street Kings", "result": "1st", "time": "10.54s"},
                {"date": "2024-12-05", "event": "South Central Showdown", "result": "2nd", "time": "10.78s"},
            ],
            trust_score=92.8,
            verified=False
        )
        
        turbo_machine = Machine(
            machine_id="machine_turbo_1",
            name="Blue Bullet",
            year=2002,
            make="Honda",
            model="Civic SI",
            machine_class=MachineClass.STREET,
            engine="K24 Turbo",
            parts=["Garrett G25-550", "Hondata KPro", "ACT Clutch", "BC Racing"],
            stats={"hp": 510, "weight": 2580, "power_to_weight": 5.06}
        )
        
        turbo = Account(
            user_id="jockey_turbo",
            username="Turbo",
            account_type=AccountType.JOCKEY,
            email="turbo@redline.local",
            redline_card=turbo_card,
            garage=[turbo_machine],
            wallet=turbo_wallet
        )
        
        # === TEAM OWNER ===
        
        # Alex "King" Rodriguez - Team Owner
        king_wallet = RedlineWallet("wallet_king", "owner_king", 8750.00)
        king_card = RedlineCard(
            card_id="card_king_team",
            card_type=CardType.TEAM,
            name="King's Court Racing",
            bio="Premier street racing team in SoCal. We don't race for trophies. We race for legacy.",
            classes=["Street", "Sport", "Pro"],
            stats={
                "total_events": 23,
                "team_wins": 38,
                "tournaments_won": 4,
                "total_earnings": "$127,500",
                "avg_payout": "$5,543"
            },
            history=[
                {"date": "2024-12-01", "event": "West Coast Tournament", "result": "Champions"},
                {"date": "2024-11-15", "event": "SoCal Invitational", "result": "2nd Place"},
            ],
            trust_score=97.8,
            verified=True
        )
        
        king = Account(
            user_id="owner_king",
            username="KingRodriguez",
            account_type=AccountType.TEAM_OWNER,
            email="king@redline.local",
            redline_card=king_card,
            wallet=king_wallet,
            team_members=["jockey_ghost", "jockey_nitro"]
        )
        
        # Update jockeys with team affiliation
        ghost.team_owner_id = "owner_king"
        nitro.team_owner_id = "owner_king"
        
        # === SPECTATORS ===
        
        spec1_wallet = RedlineWallet("wallet_spec1", "spec_mike", 450.00)
        spec1 = Account(
            user_id="spec_mike",
            username="MikeTheSpec",
            account_type=AccountType.SPECTATOR,
            email="mike@redline.local",
            wallet=spec1_wallet
        )
        
        spec2_wallet = RedlineWallet("wallet_spec2", "spec_sarah", 680.00)
        spec2 = Account(
            user_id="spec_sarah",
            username="SarahPicks",
            account_type=AccountType.SPECTATOR,
            email="sarah@redline.local",
            wallet=spec2_wallet
        )
        
        # Add all accounts
        self.accounts = {
            "jockey_ghost": ghost,
            "jockey_apex": apex,
            "jockey_nitro": nitro,
            "jockey_turbo": turbo,
            "owner_king": king,
            "spec_mike": spec1,
            "spec_sarah": spec2
        }
        
        # === CREATE SOME RUNS ===
        
        # Upcoming Run 1: Street Race
        run1 = RedlineRun(
            run_id="run_001",
            name="New Year's Eve Street Battle",
            run_type=RunType.RACE,
            creator_id="jockey_ghost",
            date_time=(datetime.now() + timedelta(days=6, hours=23)).isoformat(),
            location="Terminal Island, Long Beach",
            description="Head-to-head street class showdown. Winner takes all. $500 entry.",
            machine_class=MachineClass.STREET,
            entry_fee=500.00,
            access_type=AccessType.GENERAL,
            access_price=25.00,
            participants=["jockey_ghost", "jockey_turbo"],
            picks_enabled=True,
            current_odds={"jockey_ghost": 1.65, "jockey_turbo": 2.30}
        )
        
        # Upcoming Run 2: Pro Tournament
        run2 = RedlineRun(
            run_id="run_002",
            name="SoCal Winter Championship",
            run_type=RunType.TOURNAMENT,
            creator_id="owner_king",
            date_time=(datetime.now() + timedelta(days=14)).isoformat(),
            location="Irwindale Speedway",
            description="8-car bracketed tournament. King's Court Racing presents the biggest event of Q1. Pro class only.",
            machine_class=MachineClass.PRO,
            entry_fee=2000.00,
            access_type=AccessType.VIP,
            access_price=150.00,
            participants=["jockey_nitro", "jockey_apex"],
            picks_enabled=True,
            current_odds={"jockey_nitro": 1.85, "jockey_apex": 2.10}
        )
        
        # More upcoming runs for Ghost to show earnings potential
        run4 = RedlineRun(
            run_id="run_004",
            name="Long Beach Night Shift",
            run_type=RunType.RACE,
            creator_id="jockey_apex",
            date_time=(datetime.now() + timedelta(days=3, hours=20)).isoformat(),
            location="Long Beach Port District",
            description="Street class grudge match. Fast money.",
            machine_class=MachineClass.STREET,
            entry_fee=750.00,
            access_type=AccessType.RACER_ONLY,
            access_price=0.00,
            participants=["jockey_ghost", "jockey_apex", "jockey_turbo"],
            picks_enabled=False,
            current_odds={"jockey_ghost": 1.95, "jockey_apex": 2.10, "jockey_turbo": 3.20}
        )
        
        run5 = RedlineRun(
            run_id="run_005",
            name="Terminal Island Throwdown",
            run_type=RunType.RACE,
            creator_id="jockey_turbo",
            date_time=(datetime.now() + timedelta(days=10, hours=22)).isoformat(),
            location="Terminal Island",
            description="Street class open challenge.",
            machine_class=MachineClass.STREET,
            entry_fee=600.00,
            access_type=AccessType.GENERAL,
            access_price=30.00,
            participants=["jockey_ghost", "jockey_turbo"],
            picks_enabled=True,
            current_odds={"jockey_ghost": 1.75, "jockey_turbo": 2.15}
        )
        
        # Past Run (for history)
        run3 = RedlineRun(
            run_id="run_003",
            name="Christmas Eve Grudge Match",
            run_type=RunType.RACE,
            creator_id="jockey_apex",
            date_time=(datetime.now() - timedelta(days=1)).isoformat(),
            location="San Diego - Qualcomm Lot",
            description="Sport class rivalry settled.",
            machine_class=MachineClass.SPORT,
            entry_fee=750.00,
            access_type=AccessType.PIT,
            access_price=50.00,
            participants=["jockey_apex", "jockey_nitro"],
            picks_enabled=True,
            picks_locked=True,
            results_posted=True,
            results={
                "winner": "jockey_apex",
                "times": {
                    "jockey_apex": "9.94s",
                    "jockey_nitro": "10.01s"
                },
                "payout": 1500.00
            },
            current_odds={"jockey_apex": 2.20, "jockey_nitro": 1.70}
        )
        
        self.runs = {
            "run_001": run1,
            "run_002": run2,
            "run_003": run3,
            "run_004": run4,
            "run_005": run5
        }
        
        # === CREATE SOME PICKS ===
        
        pick1 = RedlinePick(
            pick_id="pick_001",
            user_id="spec_mike",
            run_id="run_001",
            pick_type=PickType.WINNER,
            prediction="jockey_ghost",
            amount=50.00,
            odds=1.65,
            locked=False
        )
        
        pick2 = RedlinePick(
            pick_id="pick_002",
            user_id="spec_sarah",
            run_id="run_002",
            pick_type=PickType.WINNER,
            prediction="jockey_nitro",
            amount=100.00,
            odds=1.85,
            locked=False
        )
        
        # Past pick that won
        pick3 = RedlinePick(
            pick_id="pick_003",
            user_id="spec_mike",
            run_id="run_003",
            pick_type=PickType.WINNER,
            prediction="jockey_apex",
            amount=75.00,
            odds=2.20,
            locked=True,
            won=True,
            payout=165.00  # 75 * 2.20
        )
        
        self.picks = {
            "pick_001": pick1,
            "pick_002": pick2,
            "pick_003": pick3
        }
        
        # Add winning transaction to spectator wallet
        spec1_wallet.add_transaction(165.00, "Win payout - Christmas Eve Grudge Match", "pick_win")
    
    # ========================================================================
    # USER MANAGEMENT
    # ========================================================================
    
    def login(self, username: str) -> bool:
        """Log in as a user"""
        for account in self.accounts.values():
            if account.username.lower() == username.lower():
                self.current_user = account
                return True
        return False
    
    def get_current_user(self) -> Optional[Account]:
        """Get currently logged in user"""
        return self.current_user
    
    # ========================================================================
    # DISPLAY FUNCTIONS
    # ========================================================================
    
    def show_redline_card(self, card: RedlineCard):
        """Display a Redline Card"""
        console.clear()
        
        # Header
        title = f"🏁 {card.name}"
        if card.verified:
            title += " ✓"
        
        panel_content = []
        panel_content.append(f"[bold]{card.card_type.value} Card[/bold]")
        panel_content.append(f"\n[italic]{card.bio}[/italic]\n")
        
        # Classes
        classes_str = ", ".join(card.classes)
        panel_content.append(f"[yellow]Classes:[/yellow] {classes_str}")
        
        # Stats
        panel_content.append(f"\n[cyan]═══ STATS ═══[/cyan]")
        for key, value in card.stats.items():
            formatted_key = key.replace("_", " ").title()
            panel_content.append(f"  {formatted_key}: [green]{value}[/green]")
        
        # Trust Score
        trust_color = "green" if card.trust_score >= 95 else "yellow" if card.trust_score >= 85 else "red"
        panel_content.append(f"\n[{trust_color}]Redline Trust: {card.trust_score:.1f}/100[/{trust_color}]")
        
        # Recent History
        if card.history:
            panel_content.append(f"\n[cyan]═══ RECENT HISTORY ═══[/cyan]")
            for entry in card.history[:5]:
                date = entry.get("date", "")
                event = entry.get("event", "")
                result = entry.get("result", "")
                time_str = entry.get("time", "")
                panel_content.append(f"  {date} - {event}")
                panel_content.append(f"    Result: [green]{result}[/green] | Time: [yellow]{time_str}[/yellow]")
        
        console.print(Panel("\n".join(panel_content), title=title, border_style="red", padding=(1, 2)))
        console.print()
    
    def show_run_board(self):
        """Display all upcoming runs"""
        console.clear()
        console.print(Panel.fit("🏁 [bold red]REDLINE[/bold red] | RUN BOARD", border_style="red"))
        console.print()
        
        # Filter upcoming runs
        now = datetime.now()
        upcoming_runs = [run for run in self.runs.values() 
                        if not run.results_posted and datetime.fromisoformat(run.date_time) > now]
        
        if not upcoming_runs:
            console.print("[yellow]No upcoming runs scheduled.[/yellow]")
            return
        
        # Sort by date
        upcoming_runs.sort(key=lambda r: r.date_time)
        
        for run in upcoming_runs:
            self._display_run_summary(run)
            console.print()
    
    def _display_run_summary(self, run: RedlineRun):
        """Display a single run summary"""
        run_date = datetime.fromisoformat(run.date_time)
        days_until = (run_date - datetime.now()).days
        
        # Build content
        content = []
        
        # Add Run ID at the top prominently
        content.append(f"[bold yellow]Run ID: {run.run_id}[/bold yellow]")
        content.append(f"[bold white]{run.name}[/bold white]")
        content.append(f"[dim]{run.run_type.value} | {run.machine_class.value} Class[/dim]")
        content.append(f"\n📍 {run.location}")
        content.append(f"📅 {run_date.strftime('%B %d, %Y at %I:%M %p')}")
        if days_until >= 0:
            content.append(f"[yellow]⏰ {days_until} days away[/yellow]")
        content.append(f"\n[italic]{run.description}[/italic]")
        
        # Participants
        participant_names = []
        for p_id in run.participants:
            if p_id in self.accounts:
                acc = self.accounts[p_id]
                name = acc.redline_card.name if acc.redline_card else acc.username
                participant_names.append(name)
        
        content.append(f"\n[cyan]Jockeys:[/cyan] {', '.join(participant_names)}")
        
        # Entry & Access
        if run.entry_fee > 0:
            content.append(f"[green]💵 Entry Fee: ${run.entry_fee:,.2f}[/green]")
        
        if run.access_type != AccessType.NONE and run.access_type != AccessType.RACER_ONLY:
            content.append(f"[blue]🎟️  {run.access_type.value}: ${run.access_price:,.2f}[/blue]")
        
        # Picks & Odds
        if run.picks_enabled and run.current_odds:
            content.append(f"\n[yellow]═══ CURRENT ODDS ═══[/yellow]")
            for participant_id, odds in run.current_odds.items():
                if participant_id in self.accounts:
                    acc = self.accounts[participant_id]
                    name = acc.username
                    content.append(f"  {name}: [yellow]{odds}[/yellow]")
        
        border_color = "green" if run.picks_enabled else "blue"
        console.print(Panel("\n".join(content), border_style=border_color, padding=(1, 2)))
    
    def show_my_runs_and_earnings(self, account: Account):
        """Display jockey's scheduled runs with potential earnings"""
        console.clear()
        console.print(Panel.fit("🏁 [bold red]MY RUNS & POTENTIAL EARNINGS[/bold red]", border_style="red"))
        console.print()
        
        if account.account_type != AccountType.JOCKEY:
            console.print("[red]This feature is only available for jockeys.[/red]")
            return
        
        # Get all upcoming runs this jockey is in
        now = datetime.now()
        my_runs = [
            run for run in self.runs.values()
            if account.user_id in run.participants 
            and not run.results_posted
            and datetime.fromisoformat(run.date_time) > now
        ]
        
        if not my_runs:
            console.print("[yellow]You're not registered for any upcoming runs.[/yellow]")
            console.print("\n[dim]Check the Run Board to join or create new runs.[/dim]")
            return
        
        # Sort by date
        my_runs.sort(key=lambda r: r.date_time)
        
        # Calculate timeframes
        one_week = now + timedelta(days=7)
        two_weeks = now + timedelta(days=14)
        
        total_potential_week = 0.0
        total_potential_two_weeks = 0.0
        total_invested = 0.0
        
        # Create table
        table = Table(show_header=True, header_style="bold cyan", box=box.ROUNDED)
        table.add_column("Date", style="dim", width=12)
        table.add_column("Run Name", style="white", width=25)
        table.add_column("Class", style="yellow", width=8)
        table.add_column("Entry", justify="right", width=10)
        table.add_column("Pot", justify="right", width=10)
        table.add_column("Potential Win", justify="right", width=14)
        table.add_column("Days Out", justify="center", width=10)
        
        for run in my_runs:
            run_date = datetime.fromisoformat(run.date_time)
            days_until = (run_date - now).days
            
            # Calculate potential earnings
            total_pot = run.entry_fee * len(run.participants)
            platform_cut = total_pot * 0.10  # 10% Redline cut
            potential_win = total_pot - platform_cut
            
            # Add to totals
            total_invested += run.entry_fee
            
            if run_date <= one_week:
                total_potential_week += potential_win
            if run_date <= two_weeks:
                total_potential_two_weeks += potential_win
            
            # Format values
            date_str = run_date.strftime("%m/%d")
            entry_str = f"${run.entry_fee:,.0f}" if run.entry_fee > 0 else "-"
            pot_str = f"${total_pot:,.0f}"
            win_str = f"[green]${potential_win:,.0f}[/green]"
            days_str = f"[yellow]{days_until}d[/yellow]"
            
            table.add_row(
                date_str,
                run.name[:24],
                run.machine_class.value,
                entry_str,
                pot_str,
                win_str,
                days_str
            )
        
        console.print(table)
        console.print()
        
        # Summary panels
        summary_panels = []
        
        # Investment summary
        investment_content = (
            f"Total Entry Fees Paid:\n"
            f"[yellow]${total_invested:,.2f}[/yellow]"
        )
        summary_panels.append(Panel(
            investment_content,
            title="💰 Investment",
            border_style="yellow",
            width=30
        ))
        
        # Weekly potential
        week_content = (
            f"If you win all runs\nin the next 7 days:\n\n"
            f"[green bold]${total_potential_week:,.2f}[/green bold]"
        )
        summary_panels.append(Panel(
            week_content,
            title="📅 This Week Potential",
            border_style="green",
            width=30
        ))
        
        # Two-week potential
        two_week_content = (
            f"If you win all runs\nin the next 14 days:\n\n"
            f"[green bold]${total_potential_two_weeks:,.2f}[/green bold]"
        )
        summary_panels.append(Panel(
            two_week_content,
            title="📅 Two Week Potential",
            border_style="green",
            width=30
        ))
        
        console.print(Columns(summary_panels))
        console.print()
        
        # Add context based on win rate
        if account.redline_card:
            win_rate_str = account.redline_card.stats.get("win_rate", "0%")
            try:
                win_rate = float(win_rate_str.rstrip('%'))
                realistic_week = total_potential_week * (win_rate / 100)
                realistic_two_weeks = total_potential_two_weeks * (win_rate / 100)
                
                console.print(f"[dim]Based on your {win_rate_str} win rate:[/dim]")
                console.print(f"[dim]  Realistic 7-day earnings: [white]${realistic_week:,.2f}[/white][/dim]")
                console.print(f"[dim]  Realistic 14-day earnings: [white]${realistic_two_weeks:,.2f}[/white][/dim]")
            except:
                pass
        
        console.print()
        console.print("[cyan]═══ BREAKDOWN BY RUN ═══[/cyan]\n")
        
        # Detailed breakdown
        for run in my_runs:
            run_date = datetime.fromisoformat(run.date_time)
            days_until = (run_date - now).days
            
            # Calculate odds-based info
            your_odds = run.current_odds.get(account.user_id, 2.0)
            implied_win_chance = (1 / your_odds) * 100
            
            total_pot = run.entry_fee * len(run.participants)
            platform_cut = total_pot * 0.10
            potential_win = total_pot - platform_cut
            
            # Position assessment based on odds
            if your_odds < 2.0:
                position = "[green]Favorite[/green]"
            elif your_odds < 2.5:
                position = "[yellow]Contender[/yellow]"
            else:
                position = "[red]Underdog[/red]"
            
            console.print(f"[bold white]• {run.name}[/bold white] ([dim]ID: {run.run_id}[/dim]) - {days_until} days")
            console.print(f"  Position: {position} | Your odds: [yellow]{your_odds}[/yellow] | Implied chance: [dim]{implied_win_chance:.1f}%[/dim]")
            console.print(f"  Participants: {len(run.participants)} | Entry: ${run.entry_fee:.0f} | Win: [green]${potential_win:.0f}[/green]")
            console.print()
    
    def show_garage(self, account: Account):
        """Display garage and machines"""
        console.clear()
        console.print(Panel.fit("🏁 [bold red]REDLINE GARAGE[/bold red]", border_style="red"))
        console.print()
        
        if not account.garage:
            console.print("[yellow]No machines in garage.[/yellow]")
            return
        
        for machine in account.garage:
            self._display_machine(machine)
            console.print()
    
    def _display_machine(self, machine: Machine):
        """Display machine details"""
        content = []
        content.append(f"[bold white]{machine.name}[/bold white]")
        content.append(f"[dim]{machine.year} {machine.make} {machine.model}[/dim]")
        content.append(f"\n[yellow]Class:[/yellow] {machine.machine_class.value}")
        content.append(f"[yellow]Engine:[/yellow] {machine.engine}")
        
        # Stats
        content.append(f"\n[cyan]═══ SPECS ═══[/cyan]")
        for key, value in machine.stats.items():
            content.append(f"  {key.upper()}: [green]{value}[/green]")
        
        # Parts
        if machine.parts:
            content.append(f"\n[cyan]═══ PARTS ═══[/cyan]")
            for part in machine.parts:
                content.append(f"  • {part}")
        
        console.print(Panel("\n".join(content), border_style="yellow", padding=(1, 2)))
    
    def show_wallet(self, account: Account):
        """Display wallet and transactions"""
        console.clear()
        console.print(Panel.fit("🏁 [bold red]REDLINE WALLET[/bold red]", border_style="red"))
        console.print()
        
        if not account.wallet:
            console.print("[yellow]No wallet available for this account type.[/yellow]")
            return
        
        # Balance
        balance_color = "green" if account.wallet.balance >= 0 else "red"
        console.print(Panel(
            f"[{balance_color} bold]${account.wallet.balance:,.2f}[/{balance_color} bold]",
            title="Current Balance",
            border_style=balance_color
        ))
        console.print()
        
        # Recent transactions
        if account.wallet.transactions:
            console.print("[cyan]═══ RECENT TRANSACTIONS ═══[/cyan]\n")
            
            table = Table(show_header=True, header_style="bold cyan")
            table.add_column("Date", style="dim")
            table.add_column("Type")
            table.add_column("Description")
            table.add_column("Amount", justify="right")
            table.add_column("Balance", justify="right")
            
            # Show last 10 transactions
            for trans in account.wallet.transactions[-10:]:
                date = datetime.fromisoformat(trans["timestamp"]).strftime("%m/%d %I:%M%p")
                trans_type = trans["type"]
                desc = trans["description"]
                amount = trans["amount"]
                balance = trans["balance_after"]
                
                amount_color = "green" if amount >= 0 else "red"
                amount_str = f"[{amount_color}]${amount:+,.2f}[/{amount_color}]"
                balance_str = f"${balance:,.2f}"
                
                table.add_row(date, trans_type, desc, amount_str, balance_str)
            
            console.print(table)
        else:
            console.print("[dim]No transactions yet.[/dim]")
    
    def show_my_picks(self, account: Account):
        """Display user's picks"""
        console.clear()
        console.print(Panel.fit("🏁 [bold red]MY REDLINE PICKS[/bold red]", border_style="red"))
        console.print()
        
        user_picks = [p for p in self.picks.values() if p.user_id == account.user_id]
        
        if not user_picks:
            console.print("[yellow]You haven't made any picks yet.[/yellow]")
            return
        
        # Separate active and settled picks
        active_picks = [p for p in user_picks if p.won is None]
        settled_picks = [p for p in user_picks if p.won is not None]
        
        if active_picks:
            console.print("[cyan]═══ ACTIVE PICKS ═══[/cyan]\n")
            for pick in active_picks:
                run = self.runs.get(pick.run_id)
                if run:
                    predicted_user = self.accounts.get(pick.prediction)
                    predicted_name = predicted_user.username if predicted_user else pick.prediction
                    
                    status = "[yellow]LOCKED[/yellow]" if pick.locked else "[green]ACTIVE[/green]"
                    console.print(f"{status} | {run.name}")
                    console.print(f"  Pick: [white]{predicted_name}[/white] @ {pick.odds} odds")
                    console.print(f"  Amount: [green]${pick.amount:.2f}[/green]")
                    console.print(f"  Potential payout: [yellow]${pick.amount * pick.odds:.2f}[/yellow]\n")
        
        if settled_picks:
            console.print("[cyan]═══ SETTLED PICKS ═══[/cyan]\n")
            for pick in settled_picks:
                run = self.runs.get(pick.run_id)
                if run:
                    predicted_user = self.accounts.get(pick.prediction)
                    predicted_name = predicted_user.username if predicted_user else pick.prediction
                    
                    if pick.won:
                        status = "[bold green]✓ WON[/bold green]"
                        payout_str = f"[green]${pick.payout:.2f}[/green]"
                    else:
                        status = "[bold red]✗ LOST[/bold red]"
                        payout_str = "[dim]$0.00[/dim]"
                    
                    console.print(f"{status} | {run.name}")
                    console.print(f"  Pick: {predicted_name} @ {pick.odds} odds")
                    console.print(f"  Amount: ${pick.amount:.2f} | Payout: {payout_str}\n")
    
    def show_run_details(self, run: RedlineRun):
        """Show detailed view of a run"""
        console.clear()
        
        # Title with Run ID
        title = f"🏁 {run.name} [ID: {run.run_id}]"
        
        content = []
        content.append(f"[bold]{run.run_type.value}[/bold] | [yellow]{run.machine_class.value} Class[/yellow]")
        
        run_date = datetime.fromisoformat(run.date_time)
        content.append(f"\n📍 {run.location}")
        content.append(f"📅 {run_date.strftime('%B %d, %Y at %I:%M %p')}")
        
        # Creator
        creator = self.accounts.get(run.creator_id)
        if creator:
            creator_name = creator.redline_card.name if creator.redline_card else creator.username
            content.append(f"👤 Created by: {creator_name}")
        
        content.append(f"\n[italic]{run.description}[/italic]")
        
        # Participants with stats
        content.append(f"\n[cyan]═══ PARTICIPANTS ═══[/cyan]")
        for p_id in run.participants:
            if p_id in self.accounts:
                acc = self.accounts[p_id]
                if acc.redline_card:
                    name = acc.redline_card.name
                    win_rate = acc.redline_card.stats.get("win_rate", "N/A")
                    best_time = acc.redline_card.stats.get("best_time", "N/A")
                    content.append(f"\n  [white]{name}[/white]")
                    content.append(f"    Win Rate: [green]{win_rate}[/green] | Best Time: [yellow]{best_time}[/yellow]")
        
        # Financial details
        content.append(f"\n[cyan]═══ DETAILS ═══[/cyan]")
        if run.entry_fee > 0:
            content.append(f"💵 Entry Fee: [green]${run.entry_fee:,.2f}[/green]")
        
        if run.access_type != AccessType.NONE and run.access_type != AccessType.RACER_ONLY:
            content.append(f"🎟️  {run.access_type.value}: [blue]${run.access_price:,.2f}[/blue]")
        
        # Picks
        if run.picks_enabled:
            pick_count = len([p for p in self.picks.values() if p.run_id == run.run_id])
            content.append(f"🎲 Picks Enabled: [yellow]{pick_count} picks made[/yellow]")
            
            if run.picks_locked:
                content.append(f"[red]🔒 Picks are LOCKED[/red]")
        
        # Results if posted
        if run.results_posted and run.results:
            content.append(f"\n[cyan]═══ RESULTS ═══[/cyan]")
            winner_id = run.results.get("winner")
            if winner_id and winner_id in self.accounts:
                winner = self.accounts[winner_id]
                winner_name = winner.redline_card.name if winner.redline_card else winner.username
                content.append(f"[bold green]🏆 WINNER: {winner_name}[/bold green]")
            
            if "times" in run.results:
                content.append(f"\n[yellow]Times:[/yellow]")
                for jockey_id, time in run.results["times"].items():
                    if jockey_id in self.accounts:
                        jockey = self.accounts[jockey_id]
                        jockey_name = jockey.username
                        content.append(f"  {jockey_name}: [white]{time}[/white]")
        
        console.print(Panel("\n".join(content), title=title, border_style="red", padding=(1, 2)))
    
    # ========================================================================
    # ACTIONS
    # ========================================================================
    
    def make_pick(self, account: Account, run_id: str):
        """Make a pick on a run"""
        run = self.runs.get(run_id)
        if not run:
            console.print("[red]Run not found.[/red]")
            return
        
        if not run.picks_enabled:
            console.print("[red]Picks are not enabled for this run.[/red]")
            return
        
        if run.picks_locked:
            console.print("[red]Picks are locked for this run.[/red]")
            return
        
        console.clear()
        console.print(Panel.fit(f"🎲 Make a Pick: {run.name}", border_style="yellow"))
        console.print()
        
        # Show participants and odds
        console.print("[cyan]Available Picks:[/cyan]\n")
        for i, p_id in enumerate(run.participants, 1):
            if p_id in self.accounts:
                acc = self.accounts[p_id]
                name = acc.redline_card.name if acc.redline_card else acc.username
                odds = run.current_odds.get(p_id, 2.0)
                console.print(f"[{i}] {name} - [yellow]Odds: {odds}[/yellow]")
        
        console.print()
        
        # Get pick
        choice = Prompt.ask("Choose a jockey (number)", choices=[str(i) for i in range(1, len(run.participants) + 1)])
        choice_idx = int(choice) - 1
        selected_jockey = run.participants[choice_idx]
        
        # Get amount
        console.print(f"\n[dim]Your balance: ${account.wallet.balance:.2f}[/dim]")
        amount_str = Prompt.ask("Pick amount ($)")
        
        try:
            amount = float(amount_str)
            if amount <= 0:
                console.print("[red]Amount must be positive.[/red]")
                return
            if amount > account.wallet.balance:
                console.print("[red]Insufficient funds.[/red]")
                return
        except ValueError:
            console.print("[red]Invalid amount.[/red]")
            return
        
        # Create pick
        pick_id = f"pick_{len(self.picks) + 1:03d}"
        odds = run.current_odds.get(selected_jockey, 2.0)
        
        new_pick = RedlinePick(
            pick_id=pick_id,
            user_id=account.user_id,
            run_id=run_id,
            pick_type=PickType.WINNER,
            prediction=selected_jockey,
            amount=amount,
            odds=odds,
            locked=False
        )
        
        self.picks[pick_id] = new_pick
        
        # Deduct from wallet
        account.wallet.add_transaction(-amount, f"Pick - {run.name}", "pick_placed")
        
        # Show confirmation
        jockey = self.accounts[selected_jockey]
        jockey_name = jockey.redline_card.name if jockey.redline_card else jockey.username
        potential_payout = amount * odds
        
        console.print()
        console.print(Panel(
            f"[green]✓ Pick confirmed![/green]\n\n"
            f"Run: {run.name}\n"
            f"Jockey: {jockey_name}\n"
            f"Amount: ${amount:.2f}\n"
            f"Odds: {odds}\n"
            f"Potential payout: [yellow]${potential_payout:.2f}[/yellow]",
            title="Pick Placed",
            border_style="green"
        ))
    
    def create_run(self, account: Account):
        """Create a new run"""
        console.clear()
        
        # Check permissions
        if account.account_type == AccountType.SPECTATOR:
            console.print("[red]Spectators cannot create runs.[/red]")
            return
        
        console.print(Panel.fit("🏁 Create a New Run", border_style="red"))
        console.print()
        
        # Get run type
        if account.account_type == AccountType.TEAM_OWNER:
            console.print("Run Type:")
            console.print("[1] Race")
            console.print("[2] Tournament")
            run_type_choice = Prompt.ask("Choose type", choices=["1", "2"])
            run_type = RunType.RACE if run_type_choice == "1" else RunType.TOURNAMENT
        else:
            run_type = RunType.RACE
            console.print("[dim]Creating a Race (Jockeys can only create races)[/dim]\n")
        
        # Basic details
        name = Prompt.ask("Run name")
        location = Prompt.ask("Location")
        description = Prompt.ask("Description")
        
        # Date/time (simplified for demo)
        days_out = int(Prompt.ask("Days from now", default="7"))
        run_datetime = (datetime.now() + timedelta(days=days_out)).isoformat()
        
        # Class
        console.print("\nMachine Class:")
        console.print("[1] Street")
        console.print("[2] Sport")
        console.print("[3] Pro")
        console.print("[4] Unlimited")
        class_choice = Prompt.ask("Choose class", choices=["1", "2", "3", "4"])
        machine_class = [MachineClass.STREET, MachineClass.SPORT, MachineClass.PRO, MachineClass.UNLIMITED][int(class_choice) - 1]
        
        # Entry fee
        entry_fee = float(Prompt.ask("Entry fee ($)", default="0"))
        
        # Access
        console.print("\nAccess Type:")
        console.print("[1] No Access")
        console.print("[2] General Access")
        console.print("[3] VIP Access")
        console.print("[4] Pit Access")
        console.print("[5] Racer-Only")
        access_choice = Prompt.ask("Choose access type", choices=["1", "2", "3", "4", "5"])
        access_type = [AccessType.NONE, AccessType.GENERAL, AccessType.VIP, AccessType.PIT, AccessType.RACER_ONLY][int(access_choice) - 1]
        
        access_price = 0.0
        if access_type not in [AccessType.NONE, AccessType.RACER_ONLY]:
            access_price = float(Prompt.ask("Access price ($)", default="0"))
        
        # Picks
        picks_enabled = Confirm.ask("Enable picks?", default=True)
        
        # Create run
        run_id = f"run_{len(self.runs) + 1:03d}"
        participants = [account.user_id]  # Creator is first participant
        
        new_run = RedlineRun(
            run_id=run_id,
            name=name,
            run_type=run_type,
            creator_id=account.user_id,
            date_time=run_datetime,
            location=location,
            description=description,
            machine_class=machine_class,
            entry_fee=entry_fee,
            access_type=access_type,
            access_price=access_price,
            participants=participants,
            picks_enabled=picks_enabled,
            current_odds={account.user_id: 2.0}
        )
        
        self.runs[run_id] = new_run
        
        console.print()
        console.print(Panel(
            f"[green]✓ Run created successfully![/green]\n\n"
            f"[bold yellow]Run ID: {run_id}[/bold yellow]\n"
            f"{name}\n"
            f"{run_datetime}\n"
            f"{location}",
            title="Run Created",
            border_style="green"
        ))
    
    def join_run(self, account: Account, run_id: str):
        """Join an existing run"""
        run = self.runs.get(run_id)
        if not run:
            console.print("[red]Run not found.[/red]")
            return
        
        if account.account_type != AccountType.JOCKEY:
            console.print("[red]Only jockeys can join runs.[/red]")
            return
        
        if account.user_id in run.participants:
            console.print("[yellow]You're already in this run.[/yellow]")
            return
        
        # Check entry fee
        if run.entry_fee > 0:
            if account.wallet.balance < run.entry_fee:
                console.print(f"[red]Insufficient funds. Entry fee: ${run.entry_fee:.2f}[/red]")
                return
            
            confirm = Confirm.ask(f"Entry fee is ${run.entry_fee:.2f}. Proceed?")
            if not confirm:
                return
            
            # Deduct entry fee
            account.wallet.add_transaction(-run.entry_fee, f"Entry fee - {run.name}", "entry_fee")
        
        # Add to participants
        run.participants.append(account.user_id)
        
        # Update odds (simplified)
        base_odds = 2.0
        run.current_odds[account.user_id] = base_odds + random.uniform(-0.3, 0.5)
        
        console.print()
        console.print(Panel(
            f"[green]✓ Successfully joined![/green]\n\n"
            f"You're now competing in:\n{run.name}",
            title="Run Joined",
            border_style="green"
        ))
    
    def post_results(self, account: Account, run_id: str):
        """Post results for a run"""
        run = self.runs.get(run_id)
        if not run:
            console.print("[red]Run not found.[/red]")
            return
        
        if run.creator_id != account.user_id:
            console.print("[red]Only the run creator can post results.[/red]")
            return
        
        if run.results_posted:
            console.print("[yellow]Results already posted for this run.[/yellow]")
            return
        
        console.clear()
        console.print(Panel.fit(f"📊 Post Results: {run.name}", border_style="red"))
        console.print()
        
        # Show participants
        console.print("[cyan]Participants:[/cyan]\n")
        for i, p_id in enumerate(run.participants, 1):
            if p_id in self.accounts:
                acc = self.accounts[p_id]
                name = acc.redline_card.name if acc.redline_card else acc.username
                console.print(f"[{i}] {name}")
        
        console.print()
        
        # Get winner
        winner_choice = Prompt.ask("Winner (number)", choices=[str(i) for i in range(1, len(run.participants) + 1)])
        winner_idx = int(winner_choice) - 1
        winner_id = run.participants[winner_idx]
        
        # Get times for each participant
        times = {}
        console.print("\n[dim]Enter times (e.g., 10.54)[/dim]")
        for p_id in run.participants:
            if p_id in self.accounts:
                acc = self.accounts[p_id]
                name = acc.username
                time_str = Prompt.ask(f"{name}'s time")
                times[p_id] = f"{time_str}s"
        
        # Calculate total pot
        total_pot = run.entry_fee * len(run.participants)
        platform_cut = total_pot * 0.10  # 10% Redline Cut
        winner_payout = total_pot - platform_cut
        
        # Post results
        run.results = {
            "winner": winner_id,
            "times": times,
            "payout": winner_payout
        }
        run.results_posted = True
        run.picks_locked = True
        
        # Pay out winner
        winner = self.accounts[winner_id]
        if winner.wallet:
            winner.wallet.add_transaction(winner_payout, f"Win - {run.name}", "race_win")
        
        # Update winner's card
        if winner.redline_card:
            winner.redline_card.history.insert(0, {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "event": run.name,
                "result": "1st",
                "time": times.get(winner_id, "N/A")
            })
            winner.redline_card.stats["wins"] = winner.redline_card.stats.get("wins", 0) + 1
            winner.redline_card.stats["total_runs"] = winner.redline_card.stats.get("total_runs", 0) + 1
        
        # Process picks
        run_picks = [p for p in self.picks.values() if p.run_id == run_id]
        for pick in run_picks:
            pick.locked = True
            if pick.prediction == winner_id:
                pick.won = True
                pick.payout = pick.amount * pick.odds
                
                # Pay out to picker
                picker = self.accounts.get(pick.user_id)
                if picker and picker.wallet:
                    picker.wallet.add_transaction(pick.payout, f"Pick win - {run.name}", "pick_win")
            else:
                pick.won = False
        
        # Show confirmation
        winner_name = winner.redline_card.name if winner.redline_card else winner.username
        
        console.print()
        console.print(Panel(
            f"[green]✓ Results posted![/green]\n\n"
            f"Winner: [bold]{winner_name}[/bold]\n"
            f"Time: {times.get(winner_id, 'N/A')}\n"
            f"Payout: [yellow]${winner_payout:.2f}[/yellow]\n"
            f"Picks processed: {len(run_picks)}",
            title="Results Posted",
            border_style="green"
        ))


# ============================================================================
# MENU SYSTEM
# ============================================================================

def clear_and_wait():
    """Helper to wait for user input"""
    console.print("\n[dim]Press Enter to continue...[/dim]")
    input()

def main_menu(platform: RedlinePlatform):
    """Main menu loop"""
    while True:
        console.clear()
        
        # Header
        console.print(Panel.fit(
            "[bold red]REDLINE[/bold red]\n"
            "[dim]The Competitive Motorsports Platform[/dim]",
            border_style="red"
        ))
        console.print()
        
        if not platform.current_user:
            # Login menu
            console.print("[cyan]Available Users (Demo):[/cyan]\n")
            for i, (user_id, account) in enumerate(platform.accounts.items(), 1):
                role = account.account_type.value
                console.print(f"[{i}] {account.username} ([dim]{role}[/dim])")
            
            console.print("\n[0] Exit")
            console.print()
            
            choice = Prompt.ask("Login as", choices=[str(i) for i in range(0, len(platform.accounts) + 1)])
            
            if choice == "0":
                console.print("\n[red]Thanks for checking out Redline![/red]")
                break
            
            user_list = list(platform.accounts.values())
            selected_user = user_list[int(choice) - 1]
            platform.current_user = selected_user
            
            console.print(f"\n[green]✓ Logged in as {selected_user.username}[/green]")
            time.sleep(1)
        
        else:
            # Main app menu
            user = platform.current_user
            
            # Show user info
            console.print(f"[bold]Logged in as:[/bold] {user.username}")
            console.print(f"[dim]Account Type: {user.account_type.value}[/dim]")
            if user.wallet:
                balance_color = "green" if user.wallet.balance >= 0 else "red"
                console.print(f"Balance: [{balance_color}]${user.wallet.balance:.2f}[/{balance_color}]")
            console.print()
            
            # Menu options based on account type
            console.print("[cyan]═══ MENU ═══[/cyan]\n")
            
            menu_options = {
                "1": "🏁 Run Board (Browse Events)",
                "2": "🎲 My Picks",
            }
            
            if user.account_type != AccountType.SPECTATOR:
                menu_options["3"] = "🏆 My Redline Card"
                menu_options["4"] = "🔧 My Garage"
            
            if user.account_type == AccountType.JOCKEY:
                menu_options["5"] = "📊 My Runs & Earnings"
                menu_options["6"] = "➕ Create Run"
                menu_options["7"] = "🏃 Join Run"
                menu_options["8"] = "✅ Post Results"
            
            if user.account_type == AccountType.TEAM_OWNER:
                menu_options["5"] = "➕ Create Run/Tournament"
                menu_options["6"] = "👥 View Team"
                menu_options["7"] = "✅ Post Results"
            
            menu_options["9"] = "💵 Wallet"
            menu_options["0"] = "🚪 Logout"
            
            for key, value in menu_options.items():
                console.print(f"[{key}] {value}")
            
            console.print()
            choice = Prompt.ask("Choose an option", choices=list(menu_options.keys()))
            
            if choice == "0":
                platform.current_user = None
                continue
            
            elif choice == "1":
                # Run Board
                platform.show_run_board()
                console.print()
                
                # Allow viewing details or making picks
                run_ids = [r.run_id for r in platform.runs.values() if not r.results_posted]
                if run_ids:
                    view_choice = Prompt.ask(
                        "Enter run number to view/make pick (or press Enter to go back)",
                        default=""
                    )
                    if view_choice.isdigit() and int(view_choice) <= len(run_ids):
                        selected_run = list(platform.runs.values())[int(view_choice) - 1]
                        platform.show_run_details(selected_run)
                        console.print()
                        
                        if Confirm.ask("Make a pick on this run?", default=False):
                            platform.make_pick(user, selected_run.run_id)
                        
                        clear_and_wait()
                else:
                    clear_and_wait()
            
            elif choice == "2":
                # My Picks
                platform.show_my_picks(user)
                clear_and_wait()
            
            elif choice == "3" and user.account_type != AccountType.SPECTATOR:
                # Redline Card
                if user.redline_card:
                    platform.show_redline_card(user.redline_card)
                else:
                    console.print("[yellow]No Redline Card available.[/yellow]")
                clear_and_wait()
            
            elif choice == "4" and user.account_type != AccountType.SPECTATOR:
                # Garage
                platform.show_garage(user)
                clear_and_wait()
            
            elif choice == "5" and user.account_type == AccountType.JOCKEY:
                # My Runs & Earnings
                platform.show_my_runs_and_earnings(user)
                clear_and_wait()
            
            elif choice == "6" and user.account_type == AccountType.JOCKEY:
                # Create Run
                platform.create_run(user)
                clear_and_wait()
            
            elif choice == "5" and user.account_type == AccountType.TEAM_OWNER:
                # Create Run/Tournament
                platform.create_run(user)
                clear_and_wait()
            
            elif choice == "6" and user.account_type == AccountType.TEAM_OWNER:
                # View Team
                console.clear()
                console.print(Panel.fit("👥 Team Members", border_style="red"))
                console.print()
                for member_id in user.team_members:
                    member = platform.accounts.get(member_id)
                    if member and member.redline_card:
                        console.print(f"• {member.redline_card.name}")
                        console.print(f"  [dim]Stats: {member.redline_card.stats.get('win_rate', 'N/A')} win rate[/dim]\n")
                clear_and_wait()
            
            elif choice == "7" and user.account_type == AccountType.JOCKEY:
                # Join Run
                platform.show_run_board()
                console.print()
                console.print("[dim]Copy the Run ID from the list above[/dim]")
                run_id = Prompt.ask("Enter Run ID to join (e.g., run_001)")
                platform.join_run(user, run_id)
                clear_and_wait()
            
            elif choice == "7" and user.account_type == AccountType.TEAM_OWNER:
                # Post Results
                console.clear()
                console.print("[cyan]Your Runs:[/cyan]\n")
                user_runs = [r for r in platform.runs.values() if r.creator_id == user.user_id and not r.results_posted]
                if user_runs:
                    for i, run in enumerate(user_runs, 1):
                        console.print(f"[{i}] {run.name} (ID: {run.run_id})")
                    console.print()
                    run_choice = Prompt.ask("Select run to post results", choices=[str(i) for i in range(1, len(user_runs) + 1)])
                    selected_run = user_runs[int(run_choice) - 1]
                    platform.post_results(user, selected_run.run_id)
                else:
                    console.print("[yellow]No runs awaiting results.[/yellow]")
                clear_and_wait()
            
            elif choice == "8" and user.account_type == AccountType.JOCKEY:
                # Post Results
                console.clear()
                console.print("[cyan]Your Runs:[/cyan]\n")
                user_runs = [r for r in platform.runs.values() if r.creator_id == user.user_id and not r.results_posted]
                if user_runs:
                    for i, run in enumerate(user_runs, 1):
                        console.print(f"[{i}] {run.name} (ID: {run.run_id})")
                    console.print()
                    run_choice = Prompt.ask("Select run to post results", choices=[str(i) for i in range(1, len(user_runs) + 1)])
                    selected_run = user_runs[int(run_choice) - 1]
                    platform.post_results(user, selected_run.run_id)
                else:
                    console.print("[yellow]No runs awaiting results.[/yellow]")
                clear_and_wait()
            
            elif choice == "9":
                # Wallet
                platform.show_wallet(user)
                clear_and_wait()


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        console.clear()
        console.print(Panel.fit(
            "[bold red]REDLINE[/bold red]\n"
            "[dim]Terminal Demo v1.0[/dim]\n\n"
            "Loading...",
            border_style="red"
        ))
        time.sleep(1)
        
        platform = RedlinePlatform()
        main_menu(platform)
        
    except KeyboardInterrupt:
        console.print("\n\n[red]Demo interrupted. See you at the track![/red]")
    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]")
        import traceback
        traceback.print_exc()