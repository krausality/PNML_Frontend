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
        new Place(2, new Point(200, 100), "p2"),
        new Place(3, new Point(300, 300), "p3"),
        new Place(0, new Point(400, 200), "p4")
    ];

    this.transitions = [
        new Transition(new Point(150, 150), "t1"),
        new Transition(new Point(250, 200), "t2"),
        new Transition(new Point(350, 250), "t3")
    ];

    this.arcs = [
        new Arc(this.places[0], this.transitions[0], 5),
        new Arc(this.transitions[0], this.places[1], 1),
        new Arc(this.places[1], this.transitions[1], 1),
        new Arc(this.transitions[1], this.places[2], 1, [new Point(250, 300)]),
    ];

    this.transitions[0].appendPreArc(this.arcs[0]);
    this.transitions[0].appendPostArc(this.arcs[1]);
    this.transitions[1].appendPreArc(this.arcs[2]);
    this.transitions[1].appendPreArc(this.arcs[3]);
  }
}
