(function () {
  'use strict';

  Tactics.units[7].extend = function (self) {
    var board = Tactics.board;
    var data = Tactics.units[self.type];
    var sounds = Object.assign({}, Tactics.sounds, data.sounds);
    var special_ready = false;

    Object.assign(self, {
      getTargetTiles: function (target) {
        return self.getAttackTiles();
      },
      playAttack: function (target, results) {
        let anim      = new Tactics.Animation();
        let direction = board.getDirection(self.assignment, target, self.direction);

        let attackAnim = self.animAttack(target);
        attackAnim.splice(1, () => sounds.attack1.play());
        attackAnim.splice(3, () => sounds.attack2.play());

        results.forEach(result => {
          let unit = result.unit;

          // Animate the target unit's reaction starting with the 4th attack frame.
          if (result.blocked)
            attackAnim
              .splice(3, unit.animBlock(self));
          else
            attackAnim
              .splice(3, self.animStrike(unit))
              .splice(4, unit.animStagger(self));
        });

        anim.splice(self.animTurn(direction));
        anim.splice(attackAnim)

        return anim.play();
      },
      canSpecial: function () {
        if (!self.canAttack())
          return false;
        else
          return (self.health + self.mHealth) < 5;
      },
      attackSpecial: function () {
        let anim = self.animSpecial();
        let cries = ['My legs!', 'What?', 'Mommy!', 'No fair!'];
        let taunts = ['Worth it', 'Bye', '...'];

        anim.splice(1, () => sounds.bomb1.play());

        let results = [];
        self.getAttackTiles().forEach(tile => {
          anim.splice(6, self.animExplode(tile));

          let target_unit = tile.assigned;
          if (!target_unit)
            return;

          let result = {unit:target_unit};

          if (target_unit.barriered)
            result.miss = true;
          else {
            result.mHealth = -target_unit.health;
            result.notice  = cries.shuffle().shift();
          }

          results.push(result);
        });

        anim.splice(6, self.animExplode(self.assignment));
        anim.splice(9, () => sounds.bomb2.play());

        results.push({
          unit:    self,
          mHealth: -self.health,
          notice:  taunts.shuffle()[0],
        });

        return anim.play().then(() => results);
      },
      /*
       * Customized so that the sound is played on the first visual frame (not 2nd).
       * Also plays a sound sprite instead of the full sound.
       */
      animBlock: function (attacker) {
        let anim = new Tactics.Animation();
        let direction = board.getDirection(self.assignment, attacker.assignment, self.direction);

        anim.addFrame(() => {
          self.origin.direction = self.direction = direction;
          sounds.block.play('block');
        });

        let indexes = [];
        for (let index = data.blocks[direction][0]; index <= data.blocks[direction][1]; index++) {
          indexes.push(index);
        }
        indexes.forEach((index, i) => anim.splice(i, () => self.drawFrame(index)));

        // Kinda hacky.  It seems that shocks should be rendered by the attacker, not defender.
        if (attacker.type === 2)
          anim.splice(1, [
            () => self.shock(direction, 1, true),
            () => self.shock(direction, 2, true),
            () => self.shock(),
          ]);
        else
          anim.splice(1, [
            () => self.shock(direction, 0, true),
            () => self.shock(direction, 1, true),
            () => self.shock(direction, 2, true),
            () => self.shock(),
          ]);

        anim.addFrame(() => self.stand(direction));

        return anim;
      },
      animSpecial: function () {
        let anim = new Tactics.Animation();
        let direction = self.direction;

        let indexes = [];
        for (let index = data.special[direction][0]; index <= data.special[direction][1]; index++) {
          indexes.push(index);
        }
        indexes.forEach(index => anim.addFrame(() => self.drawFrame(index)));

        anim.addFrame(() => self.stand(direction));

        return anim;
      },
      animExplode: function (tile) {
        let anim = new Tactics.Animation();
        let parent = Tactics.stage.children[1];
        let whiten = [0.60, 1, 0.80, 0.60, 0];

        let pos = tile.getCenter();
        let container = new PIXI.Container();
        container.position = new PIXI.Point(pos.x, pos.y);

        anim.addFrame(() => parent.addChild(container));

        let frames;
        if (tile === self.assignment)
          frames = self.effects.explode;
        else
          frames = data.effects.explode.frames.map(frame => self.compileFrame(frame, data.effects.explode));

        let index = 0;
        frames.forEach(frame => {
          anim.splice(index, [
            () => container.addChild(frame),
            () => container.removeChild(frame),
          ]);

          index++;
        });

        let target_unit = tile.assigned;
        if (target_unit) {
          if (target_unit !== self) {
            anim.splice(4, () => target_unit.drawTurn());
            anim.splice(5, () => target_unit.drawStand());
          }

          anim.splice(3, {
            script: () => target_unit.whiten(whiten.shift()),
            repeat: whiten.length,
          });
        }

        anim.splice(anim.frames.length-1, () => parent.removeChild(container));

        return anim;
      },
    });

    return self;
  };

})();
