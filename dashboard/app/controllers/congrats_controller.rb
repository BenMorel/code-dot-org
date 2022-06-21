class CongratsController < ApplicationController
  include CertificatesHelper

  def index
    view_options(full_width: true, responsive_content: true, has_i18n: true)

    begin
      course = Base64.urlsafe_decode64(params[:s])
    rescue ArgumentError, OpenSSL::Cipher::CipherError
      return render status: :bad_request, json: {message: 'invalid base64'}
    end

    @next_course_script_name = ScriptConstants.csf_next_course_recommendation(course)
    next_script = Script.get_from_cache(@next_course_script_name) if @next_course_script_name
    @next_course_title = next_script.localized_title if next_script
    @next_course_description = next_script.localized_description if next_script

    # Select two different donors, because the first must have a twitter
    # handle and the second must be equally weighted across all donors.
    @random_donor_twitter = CdoDonor.get_random_donor_twitter
    @random_donor_name = CdoDonor.get_random_donor_name
    begin
      course_name = params[:s] && Base64.urlsafe_decode64(params[:s])
      @certificate_image_url = certificate_image_url(nil, course_name, nil)
    rescue OpenSSL::Cipher::CipherError
      return render status: :bad_request, json: {message: 'invalid base64'}
    end
    @is_hoc_tutorial = CertificateImage.hoc_course?(course_name)
  end
end
