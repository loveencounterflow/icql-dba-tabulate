(function() {
  'use strict';
  var $, $drain, $watch, CND, SP, SQL, TXT, badge, debug, defaults, echo, freeze, guy, help, info, isa, lets, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper, width_of;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/DEMOS/TABULATE';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  // test                      = require '../../../apps/guy-test'
  // PATH                      = require 'path'
  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  // { to_width }              = require 'to-width'
  // on_process_exit           = require 'exit-hook'
  // sleep                     = ( dts ) -> new Promise ( done ) => setTimeout done, dts * 1000
  SQL = String.raw;

  TXT = require('intertext');

  ({width_of} = require('to-width'));

  ({lets, freeze} = require('letsfreezethat'));

  SP = require('steampipes');

  ({$, $watch, $drain} = SP.export());

  guy = require('guy');

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  types.declare('sql_limit', function(x) {
    if (this.isa.nonempty_text(x)) {
      return true;
    }
    if (this.isa.cardinal(x)) {
      return true;
    }
    return false;
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('dbatbl_walk_relation_lines_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.sql_limit x.limit": function(x) {
        return this.isa.sql_limit(x.limit);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  defaults = {
    dbatbl_walk_relation_lines_cfg: {
      limit: 10,
      order_by: 'random'
    }
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Dbatbl = class Dbatbl {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      //---------------------------------------------------------------------------------------------------------
      /* TAINT use `cfg` */
      this.tabulate_async = this.tabulate_async.bind(this);
      // validate.dbv_constructor_cfg @cfg = { types.defaults.dbv_constructor_cfg..., cfg..., }
      this.cfg = cfg;
      //.......................................................................................................
      guy.props.def(this, 'dba', {
        enumerable: false,
        value: cfg.dba
      });
      delete this.cfg.dba;
      this.cfg = freeze(this.cfg);
      this.tabulate = guy.nowait.for_awaitable(this.tabulate_async);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _estimate_column_widths(query) {
      var R, i, idx, k, len, line_count, preview_line_count, ref, ref1, ref2, row;
      preview_line_count = 10/* TAINT make configurable */
      line_count = 0;
      R = {
        leading_rows: [],
        widths: []
      };
      for (row of query) {
        line_count++;
        R.leading_rows.push(row);
        ref = Object.keys(row);
        for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
          k = ref[idx];
          R.widths[idx] = Math.max((ref1 = R.widths[idx]) != null ? ref1 : 0, width_of(rpr(k)));
          R.widths[idx] = Math.max((ref2 = R.widths[idx]) != null ? ref2 : 0, width_of(rpr(row[k])));
        }
      }
      // break if line_count >= preview_line_count
      return R;
    }

    tabulate_async(query) {
      return new Promise((resolve, reject) => {
        /* TAINT cfg option: echo as-you-go */
        /* TAINT cfg option: return list of lines */
        /* TAINT cfg option: start with newline */
        var i, leading_rows, len, pipeline, row, source, widths;
        ({leading_rows, widths} = this._estimate_column_widths(query));
        //.....................................................................................................
        source = SP.new_push_source();
        pipeline = [];
        pipeline.push(source);
        // pipeline.push $watch ( d ) -> echo d
        pipeline.push($((d, send) => {
          var k, type, v;
// debug '^76^', d
          for (k in d) {
            v = d[k];
            switch (type = type_of(v)) {
              case 'text':
                d[k] = CND.blue(v);
                break;
              default:
                d[k] = CND.white(rpr(v));
            }
          }
          return send(d);
        }));
        pipeline.push(TXT.TBL.$tabulate({
          multiline: false,
          widths
        }));
        pipeline.push($(function(d, send) {
          return send(d.text);
        }));
        pipeline.push($drain(function(result) {
          return resolve(result.join('\n'));
        }));
        SP.pull(...pipeline);
        for (i = 0, len = leading_rows.length; i < len; i++) {
          row = leading_rows[i];
          //.....................................................................................................
          source.send(row);
        }
        for (row of query) {
          source.send(row);
        }
        source.end();
        return null;
      });
    }

    //---------------------------------------------------------------------------------------------------------
    /* TAINT use `cfg` */
    * walk_relation_lines(name) {
      /* TAINT add support for schemas */
      var col_names, limit, name_i, order_by, query, ref, row_count, sample_row, type;
      name_i = this.dba.sql.I(name);
      sample_row = this.dba.first_row(this.dba.query(SQL`select * from ${name_i} limit 1`));
      col_names = Object.keys(sample_row);
      order_by = (function() {
        var results = [];
        for (var i = 1, ref = col_names.length; 1 <= ref ? i <= ref : i >= ref; 1 <= ref ? i++ : i--){ results.push(i); }
        return results;
      }).apply(this).join(', ');
      order_by = 'random()';
      limit = 10;
      type = this.dba.first_value(this.dba.query(SQL`select type from sqlite_schema where name = $name;`, {name}));
      query = this.dba.query(SQL`select * from ${name_i} order by ${order_by} limit ${limit};`);
      row_count = this.dba.first_value(this.dba.query(SQL`select count(*) from ${name_i};`));
      yield "\n";
      if (row_count > limit) {
        yield `${type} ${name_i} (${row_count} rows; first ${limit} shown)`;
      } else {
        yield `${type} ${name_i} (all ${row_count} rows)`;
      }
      yield this.tabulate(query);
      return null;
    }

  };

  //###########################################################################################################
  if (module === require.main) {
    (() => {})();
  }

}).call(this);

//# sourceMappingURL=main.js.map