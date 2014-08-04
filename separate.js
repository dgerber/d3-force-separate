(function(d3){

  d3.layout.force.separate = separate;

  if (typeof module === 'object' && module.exports){
    module.exports = separate;
  }

  function separate(force){

    if (typeof force === 'undefined') {
      force = d3.layout.force()
        .charge(0).gravity(0).friction(.85);
    }

    var padding = 10
      , stickyness = .1
      , conformity = 1.0
      , shape_separator = separate_rectangles
      , loop = loop_qtree
    ;

    force
      .on('tick.separate', function(e){
        loop(force.nodes(), trap, shape_separator, e.alpha);
      });

    force.padding = function(val){
      if (!arguments.length) return padding;
      padding = Number(val);
      return force;
    };

    force.stickyness = function(val){
      if (!arguments.length) return stickyness;
      stickyness = Number(val);
      return force;
    };

    force.conformity = function(val){
      if (!arguments.length) return conformity;
      conformity = Number(val);
      return force;
    };

    force.shape = function(val){
      if (!arguments.length) return shape_separator.name.slice(9,-1);
      shape_separator = (val === 'ellipse') ? separate_ellipses : separate_rectangles;
      return force;
    };

    force.loop = function(val){
      if (!arguments.length) return loop.name.slice(5);
      loop = (val === 'qtree') ? loop_qtree : loop_simple;
      return force;
    };

    return force;

    function loop_simple(nodes, f1, f2, alpha){
      var k = alpha * stickyness;
      nodes.forEach(function(a,i){
        f1(a, k);
        nodes.slice(i+1).forEach(function(b){
          f2(a, b, alpha);
        });
      });
    }

    function loop_qtree(nodes, f1, f2, alpha){
      var k = alpha * stickyness;
      nodes.forEach(function(a,i){
        f1(a, k);
        d3.geom.quadtree(nodes)
          .visit(function(qnode, x1, y1, x2, y2){
            var b = qnode.point;
            if (b && (b !== a)){
              f2(a, b, alpha);
            }
            // prune subtree if out of reach
            var reach = 0
              , ox = Math.min(a.x+a.width/2, x2) -
              Math.max(a.x-a.width/2, x1)
              , oy = Math.min(a.y+a.height/2, y2) -
              Math.max(a.y-a.height/2, y1);
            return -ox > reach && -oy > reach;
          });
      });
    }

    function trap(a, k){
      // "gravity" towards ideal positions
      a.x += (a.x0 - a.x) * k;
      a.y += (a.y0 - a.y) * k;
    }

    function move(ox, oy, a, b, alpha){

      // shift along the axis of ideal/target positions
      // so boxes can cross each other rather than collide
      // this makes the result more predictable
      var vx0 = a.x0 - b.x0, vy0 = a.y0 - b.y0
        , v0 = Math.sqrt(vx0 * vx0 + vy0 * vy0)
        , shift = Math.sqrt(ox * oy) * alpha
        , shiftX
        , shiftY;

      if (v0 !== 0){
        vx0 /= v0;
        vy0 /= v0;
      } else {
        var phi = Math.random() * 2 * Math.PI;
        vx0 = Math.cos(phi); vy0 = Math.sin(phi);
      }

      if (conformity === 1){
        shiftX = shift * vx0;
        shiftY = shift * vy0;
      } else {
        // values in [0,1[
        // boxes arrange more compactly side by side
        if (ox > oy){
          shiftX = shift * vx0 * conformity;
          // avoiding shiftXY << shift
          shiftY = shift * ((vy0 > 0 ? 1 : -1) * (1 - conformity) +
                            vy0 * (1 + conformity)) / 2;
        } else {
          shiftY = shift * vy0 * conformity;
          shiftX = shift * ((vx0 > 0 ? 1 : -1) * (1 - conformity) +
                            vx0 * (1 + conformity)) / 2;
        }
      }

      a.x += shiftX; b.x -= shiftX;
      a.y += shiftY; b.y -= shiftY;

    }

    function separate_rectangles(a, b, alpha){

      // overlap
      var ox = padding +
        Math.min(a.x+a.width/2, b.x+b.width/2) -
        Math.max(a.x-a.width/2, b.x-b.width/2)
        , oy = padding +
        Math.min(a.y+a.height/2, b.y+b.height/2) -
        Math.max(a.y-a.height/2, b.y-b.height/2);

      if (ox>0 && oy>0){
        move(ox, oy, a, b, alpha);
      }

    }

    function separate_ellipses(a, b, alpha){

      // center variables on larger ellipse (a), with b unit circle
      if (a.width * a.height < b.width * b.height){
        var c = b;
        b = a; a = c;
      }
      var Rx1 = (2 * padding + a.width) / b.width + 1
        , Ry1 = (2 * padding + a.height) / b.height + 1
        , X = (b.x - a.x) * 2 / b.width
        , Y = (b.y - a.y) * 2 / b.height
        , olap = Rx1*Rx1*Ry1*Ry1 - Ry1*Ry1*X*X - Rx1*Rx1*Y*Y;

      if (olap > 0){
        // gradient
        var gx = Ry1*Ry1*X //*2(Rx1*Rx1*Ry1*Ry1)
          , gy = Rx1*Rx1*Y //*2(Rx1*Rx1*Ry1*Ry1)
          , g = Math.sqrt(gx * gx + gy * gy);
        gx = Math.abs(gx / g);
        gy = Math.abs(gy / g);

        // overlap dimensions
        var idepth = olap * .5 / g
          , iwidth = idepth > 1 ? 2 : 2 * Math.sqrt(idepth * (2-idepth));

        // bbox of overlap area
        var ox = Math.max(idepth * gx, iwidth * gy) // *.89
          , oy = Math.max(idepth * gy, iwidth * gx) // *.89
        ;

        move(ox * b.width * .5, oy * b.height * .5, a, b, alpha);
      }

    }

  }

})((typeof module === 'object' && module.exports) ? require('d3') : d3);
