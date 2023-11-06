import { Component } from '@angular/core';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';

@Component({
  selector: 'app-petri-net',
  templateUrl: './petri-net.component.html',
  styleUrls: ['./petri-net.component.css']
})
export class PetriNetComponent {
  places: Place[] = [];
  transitions: Transition[] = [];
  arcs: Arc[] = [];

  constructor(){
    this.places = [
        new Place(4, new Point(100, 200), "p1"),
        new Place(2, new Point(400, 200), "p2"),
        new Place(3, new Point(800, 200), "p3"),
        new Place(0, new Point(1200, 200), "p4")
    ];

    this.transitions = [
        new Transition(new Point(200, 150), "t1"),
        new Transition(new Point(600, 200), "t2"),
        new Transition(new Point(1000, 250), "t3"),
        new Transition(new Point(1600, 250), "t4")
    ];

    this.arcs = [
        new Arc(this.places[0], this.transitions[0], 5),
        new Arc(this.transitions[0], this.places[1], 12),
        new Arc(this.places[1], this.transitions[1], 1),
        new Arc(this.transitions[1], this.places[2], 1, [new Point(700, 300)]),
        new Arc(this.transitions[2], this.places[3], 6, [new Point(800, 100), new Point(900, 350)]),
        new Arc(this.places[3], this.transitions[3], 8, [new Point(1300, 100), new Point(1400, 300), new Point(1500, 100)]),
    ];

    this.transitions[0].appendPreArc(this.arcs[0]);
    this.transitions[0].appendPostArc(this.arcs[1]);
    this.transitions[1].appendPreArc(this.arcs[2]);
    this.transitions[1].appendPreArc(this.arcs[3]);
  }
}
