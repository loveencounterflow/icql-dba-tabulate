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
  types.declare('dbatbl_dump_db_cfg', {
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
    },
    dbatbl_dump_db_cfg: {
      limit: 10,
      order_by: 'random()',
      schema: 'main'
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
      var R, i, idx, k, len, preview_line_count, ref1, ref2, ref3, row;
      preview_line_count = 10/* TAINT make configurable */
      R = {
        leading_rows: [],
        widths: []
      };
      for (row of query) {
        R.leading_rows.push(row);
        ref1 = Object.keys(row);
        for (idx = i = 0, len = ref1.length; i < len; idx = ++i) {
          k = ref1[idx];
          R.widths[idx] = Math.max((ref2 = R.widths[idx]) != null ? ref2 : 0, width_of(rpr(k)));
          R.widths[idx] = Math.max((ref3 = R.widths[idx]) != null ? ref3 : 0, width_of(rpr(row[k])));
        }
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _create_pipeline(source, widths) {
      var R, pipeline;
      pipeline = [];
      R = {pipeline};
      pipeline.push(source);
      // pipeline.push $watch ( d ) -> debug '^4354583748^', rpr d
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
      var i, idx, j, leading_rows, len, ref, ref1, ref2, row, source, widths;
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
      if (isa.generator(query)) {
        for (row of query) {
          source.send(row);
        }
      } else {
        for (idx = j = ref1 = leading_rows.length, ref2 = query.length; (ref1 <= ref2 ? j < ref2 : j > ref2); idx = ref1 <= ref2 ? ++j : --j) {
          source.send(query[idx]);
        }
      }
      source.end();
      return ref.collector;
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_relation_lines(cfg) {
      var error, error_name, field_names, k, limit, name, order_by, qname_i, query, ref1, ref2, row_count, schema, schema_i, type, value_count;
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
      value_count = row_count * field_names.length;
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
      query = this.dba.dump_relation({schema, name, order_by, limit});
      if (row_count > limit) {
        yield (CND.green(CND.reverse(` ${row_count} rows, ${value_count} values `))) + CND.steel(` ${type} ${qname_i} (${row_count} rows; first ${limit} shown)`);
      } else {
        yield (CND.green(CND.reverse(` ${row_count} rows, ${value_count} values `))) + CND.steel(` ${type} ${qname_i} (all ${row_count} rows)`);
      }
      yield this._tabulate(query);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    dump_db(cfg) {
      var db_path, limit, line, name, order_by, ref1, ref2, ref3, ref4, ref5, ref6, schema, schema_i, title, y;
      validate.dbatbl_dump_db_cfg(cfg = {...types.defaults.dbatbl_dump_db_cfg, ...cfg});
      ({schema, order_by, limit} = cfg);
      schema_i = this.dba.sql.I(schema);
      //.......................................................................................................
      db_path = (ref1 = (ref2 = this.dba._schemas) != null ? (ref3 = ref2[schema]) != null ? ref3.path : void 0 : void 0) != null ? ref1 : ':memory:';
      title = SQL`dump of SQLite DB at ${db_path}`;
      echo();
      echo(CND.white(title));
      echo(CND.white('—'.repeat(width_of(title))));
      echo();
      ref4 = this._walk_relation_lines({
        name: 'sqlite_schema',
        limit: null
      });
      for (line of ref4) {
        echo(line);
      }
      ref5 = this.dba.query(SQL`select * from ${schema_i}.sqlite_schema
where type in ( 'table', 'view' )
order by type, name;`);
      for (y of ref5) {
        ({name} = y);
        ref6 = this._walk_relation_lines({schema, name, order_by, limit});
        for (line of ref6) {
          echo(line);
        }
      }
      //.......................................................................................................
      return null;
    }

  };

  //###########################################################################################################
  if (module === require.main) {
    (() => {})();
  }

}).call(this);

//# sourceMappingURL=main.js.map