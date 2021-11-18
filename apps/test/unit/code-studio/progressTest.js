/** @file Test of progress.js. */

import assert from 'assert';
import sinon from 'sinon';
import queryString from 'query-string';

import * as viewAsRedux from '@cdo/apps/code-studio/viewAsRedux';
import {__testonly__} from '@cdo/apps/code-studio/progressRedux';
import {initViewAs} from '@cdo/apps/code-studio/progress';

describe('bestResultLevelId', function() {
  var progressData;
  const bestResultLevelId = __testonly__.bestResultLevelId;

  before(function() {
    progressData = {
      1: 0,
      2: 0,
      3: -50,
      4: 20,
      5: 100,
      6: 0,
      7: 100
    };
  });
  it("returns the level when there's only one", function() {
    assert.strictEqual(bestResultLevelId([1], progressData), 1);
  });
  it('returns the first level when none have progress', function() {
    assert.strictEqual(bestResultLevelId([1, 2], progressData), 1);
  });
  it('returns the passed level', function() {
    assert.strictEqual(bestResultLevelId([1, 4], progressData), 4);
  });
  it('returns the unsubmitted level', function() {
    assert.strictEqual(bestResultLevelId([1, 3], progressData), 3);
  });
  it('returns the perfect level over the passed level', function() {
    assert.strictEqual(bestResultLevelId([4, 5], progressData), 5);
  });
});

describe('initViewAs', function() {
  let mockStore, mockSetViewType, mockQueryStringParse;
  before(function() {
    mockStore = {
      dispatch: sinon.fake()
    };

    mockSetViewType = sinon.stub(viewAsRedux, 'setViewType');
    mockQueryStringParse = sinon.stub(queryString, 'parse').returns({});
  });

  after(function() {
    mockSetViewType.restore();
    mockQueryStringParse.restore();
  });

  it('defaults to Participant', function() {
    initViewAs(mockStore, {});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Participant));
  });

  // TODO(dmcavoy): Update so it is based on instructor instead of account type
  it('defaults to instructor if current user is a teacher', function() {
    initViewAs(mockStore, {user_type: 'teacher'});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Instructor));
  });

  // TODO(dmcavoy): Update so it is based on participant instead of account type
  it('prevents overriding default if current user is a student', function() {
    mockQueryStringParse.returns({viewAs: viewAsRedux.ViewType.Instructor});
    initViewAs(mockStore, {user_type: 'student'});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Participant));
  });

  // TODO(dmcavoy): Update so it is based on participant instead of account type
  it('allows overriding default if current user is not a student', function() {
    mockQueryStringParse.returns({viewAs: viewAsRedux.ViewType.Instructor});

    initViewAs(mockStore, {});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Instructor));

    initViewAs(mockStore, {user_type: 'teacher'});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Instructor));

    mockQueryStringParse.returns({viewAs: viewAsRedux.ViewType.Participant});

    initViewAs(mockStore, {user_type: 'teacher'});
    assert(mockSetViewType.calledWith(viewAsRedux.ViewType.Participant));
  });
});
