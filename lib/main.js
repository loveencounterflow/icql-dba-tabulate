(function() {
  'use strict';
  var $, $drain, $watch, CND, SP, SQL, TBL, badge, debug, echo, freeze, guy, help, info, isa, lets, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper, width_of;

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

  // TXT                       = require 'intertext'
  TBL = require('./intertext-tabulate');

  ({width_of} = require('to-width'));

  ({lets, freeze} = require('letsfreezethat'));

  SP = require('steampipes');

  ({$, $watch, $drain} = SP.export());

  guy = require('guy');

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  types.declare('sql_limit', function(x) {
    if (x == null) {
      return true;
    }
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
      },
      "@isa.nonempty_text x.order_by": function(x) {
        return this.isa.nonempty_text(x.order_by);
      },
      "@isa.nonempty_text x.schema": function(x) {
        return this.isa.nonempty_text(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.defaults = {
    dbatbl_walk_relation_lines_cfg: {
      limit: 10,
      order_by: 'random()',
      schema: 'main',
      name: null
    }
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Tbl = class Tbl {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      //---------------------------------------------------------------------------------------------------------
      /* TAINT use `cfg` */
      this._tabulate = this._tabulate.bind(this);
      //---------------------------------------------------------------------------------------------------------
      /* TAINT use `cfg` */
      this._tabulate_field_names = this._tabulate_field_names.bind(this);
      // validate.dbv_constructor_cfg @cfg = { types.defaults.dbv_constructor_cfg..., cfg..., }
      this.cfg = cfg;
      //.......................................................................................................
      guy.props.def(this, 'dba', {
        enumerable: false,
        value: cfg.dba
      });
      delete this.cfg.dba;
      this.cfg = freeze(this.cfg);
      // @tabulate = guy.nowait.for_awaitable @tabulate_async
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _estimate_column_widths(query) {
      var R, i, idx, k, len, line_count, preview_line_count, ref1, ref2, ref3, row;
      preview_line_count = 10/* TAINT make configurable */
      line_count = 0;
      R = {
        leading_rows: [],
        widths: []
      };
      for (row of query) {
        line_count++;
        R.leading_rows.push(row);
        ref1 = Object.keys(row);
        for (idx = i = 0, len = ref1.length; i < len; idx = ++i) {
          k = ref1[idx];
          R.widths[idx] = Math.max((ref2 = R.widths[idx]) != null ? ref2 : 0, width_of(rpr(k)));
          R.widths[idx] = Math.max((ref3 = R.widths[idx]) != null ? ref3 : 0, width_of(rpr(row[k])));
        }
      }
      // break if line_count >= preview_line_count
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _create_pipeline(source, widths) {
      var R, pipeline;
      pipeline = [];
      R = {pipeline};
      pipeline.push(source);
      pipeline.push(TBL.$tabulate({
        multiline: false,
        widths
      }));
      pipeline.push($(function(d, send) {
        return send(d.text);
      }));
      pipeline.push($drain(function(result) {
        return R.collector = result.join('\n');
      }));
      return R;
    }

    _tabulate(query) {
      /* TAINT cfg option: echo as-you-go */
      /* TAINT cfg option: return list of lines */
      /* TAINT cfg option: start with newline */
      var i, leading_rows, len, ref, row, source, widths;
      ({leading_rows, widths} = this._estimate_column_widths(query));
      //.....................................................................................................
      source = SP.new_push_source();
      ref = this._create_pipeline(source, widths);
      SP.pull(...ref.pipeline);
      for (i = 0, len = leading_rows.length; i < len; i++) {
        row = leading_rows[i];
        //.....................................................................................................
        source.send(row);
      }
      for (row of query) {
        source.send(row);
      }
      source.end();
      return ref.collector;
    }

    _tabulate_field_names(field_names) {
      /* TAINT cfg option: echo as-you-go */
      /* TAINT cfg option: return list of lines */
      /* TAINT cfg option: start with newline */
      var i, k, len, ref, source, widths;
      widths = {};
      for (i = 0, len = field_names.length; i < len; i++) {
        k = field_names[i];
        widths[k] = width_of(k);
      }
      //.....................................................................................................
      source = SP.new_push_source();
      ref = this._create_pipeline(source, widths);
      SP.pull(...ref.pipeline);
      //.....................................................................................................
      source.send(field_names);
      source.end();
      return ref.collector;
    }

    //---------------------------------------------------------------------------------------------------------
    /* TAINT use `cfg` */
    * walk_relation_lines(cfg) {
      var error, error_name, field_names, k, limit, name, order_by, qname_i, query, ref1, ref2, row_count, schema, schema_i, type;
      /* TAINT add support for schemas */
      validate.dbatbl_walk_relation_lines_cfg(cfg = {...types.defaults.dbatbl_walk_relation_lines_cfg, ...cfg});
      ({schema, name, order_by, limit} = cfg);
      schema_i = this.dba.sql.I(schema);
      qname_i = schema_i + '.' + this.dba.sql.I(name);
      limit = cfg.limit === null ? 1e9 : cfg.limit;
      //.......................................................................................................
      type = this.dba.type_of({schema, name});
      try {
        field_names = this.dba.field_names_of({schema, name});
      } catch (error1) {
        error = error1;
        error_name = (ref1 = (ref2 = error.name) != null ? ref2 : error.code) != null ? ref1 : 'error';
        yield (CND.red(CND.reverse(' X '))) + (CND.steel(` ${error_name}: ${error.message}`));
        return null;
      }
      //.......................................................................................................
      /* get row count */
      /* TAINT implement in `Dba` */
      row_count = this.dba.first_value(this.dba.query(SQL`select count(*) from ${qname_i};`));
      //.......................................................................................................
      // yield "\n"
      if (row_count === 0) {
        field_names = CND.grey('  (' + (((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = field_names.length; i < len; i++) {
            k = field_names[i];
            results.push(k);
          }
          return results;
        })()).join(', ')) + ')');
        yield (CND.yellow(CND.reverse(' 0 '))) + (CND.steel(` no rows in ${type} ${qname_i}`)) + field_names;
        // yield @_tabulate_field_names field_names
        // yield field_names.join ', '
        return null;
      }
      //.......................................................................................................
      /* dump data */
      /* TAINT implement in `Dba` */
      //.......................................................................................................
      query = this.dba.query(SQL`select * from ${qname_i} order by ${order_by} limit ${limit};`);
      if (row_count > limit) {
        yield (CND.green(CND.reverse(` ${row_count} `))) + CND.steel(` ${type} ${qname_i} (${row_count} rows; first ${limit} shown)`);
      } else {
        yield (CND.green(CND.reverse(` ${row_count} `))) + CND.steel(` ${type} ${qname_i} (all ${row_count} rows)`);
      }
      yield this._tabulate(query);
      return null;
    }

  };

  //###########################################################################################################
  if (module === require.main) {
    (() => {})();
  }

}).call(this);

//# sourceMappingURL=main.js.map